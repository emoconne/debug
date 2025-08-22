import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  success: boolean;
  error?: string;
}

export class WebScrapingService {
  private browser: puppeteer.Browser | null = null;

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeUrl(url: string, timeout: number = 10000): Promise<ScrapedContent> {
    try {
      await this.initialize();
      
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const page = await this.browser.newPage();
      
      // ユーザーエージェントを設定
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // タイムアウトを設定
      await page.setDefaultNavigationTimeout(timeout);
      
      // 不要なリソースをブロック
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      console.log(`Scraping URL: ${url}`);
      
      // ページに移動
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      if (!response || response.status() >= 400) {
        throw new Error(`HTTP ${response?.status() || 'unknown'} error`);
      }

      // ページのHTMLを取得
      const html = await page.content();
      
      // CheerioでHTMLを解析
      const $ = cheerio.load(html);
      
      // タイトルを取得
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'タイトルなし';
      
      // メインコンテンツを抽出
      let content = '';
      
      // 不要な要素を削除
      $('script, style, nav, header, footer, aside, .ad, .advertisement, .sidebar').remove();
      
      // メインコンテンツエリアを特定
      const mainSelectors = [
        'main',
        'article',
        '.content',
        '.main-content',
        '#content',
        '#main',
        '.post-content',
        '.entry-content'
      ];
      
      let mainElement = null;
      for (const selector of mainSelectors) {
        mainElement = $(selector).first();
        if (mainElement.length > 0) {
          break;
        }
      }
      
      if (mainElement.length > 0) {
        content = mainElement.text().trim();
      } else {
        // メインエリアが見つからない場合は、body全体から抽出
        content = $('body').text().trim();
      }
      
      // テキストをクリーンアップ
      content = this.cleanText(content);
      
      await page.close();
      
      return {
        url,
        title,
        content,
        success: true
      };
      
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return {
        url,
        title: '',
        content: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // 複数の空白を1つに
      .replace(/\n\s*\n/g, '\n') // 空行を削除
      .replace(/^\s+|\s+$/g, '') // 前後の空白を削除
      .substring(0, 5000); // 最大5000文字に制限
  }

  async scrapeMultipleUrls(urls: string[], maxConcurrent: number = 3): Promise<ScrapedContent[]> {
    const results: ScrapedContent[] = [];
    
    // バッチ処理で並行実行
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(url => this.scrapeUrl(url));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // バッチ間に少し待機
      if (i + maxConcurrent < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  // ダミーURLをフィルタリング
  filterValidUrls(urls: string[]): string[] {
    return urls.filter(url => {
      // ダミーURLを除外
      if (url.includes('example.com') || 
          url.includes('source/') ||
          url.startsWith('https://example.com/source/')) {
        return false;
      }
      
      // 有効なHTTP/HTTPS URLのみ
      return url.startsWith('http://') || url.startsWith('https://');
    });
  }
}
