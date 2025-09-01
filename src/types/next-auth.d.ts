import NextAuth, { DefaultSession } from "next-auth"

// https://next-auth.js.org/getting-started/typescript#module-augmentation

declare module "next-auth" {

    interface Session {
        user: {
            isAdmin: boolean;
            userType?: string;
            adminRole?: string;
            displayName?: string;
            department?: string;
            jobTitle?: string;
        } & DefaultSession["user"]
    }

    interface User {
        isAdmin: string;
    }

    interface JWT {
        userType?: string;
        adminRole?: string;
        displayName?: string;
        department?: string;
        jobTitle?: string;
    }

}
