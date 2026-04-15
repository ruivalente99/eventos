import "next-auth";

declare module "next-auth" {
  interface User {
    globalRole?: string;
  }
  interface Session {
    user: {
      id: string;
      globalRole: string;
      email: string;
      name: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    globalRole?: string;
  }
}
