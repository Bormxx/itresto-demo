import { DefaultSession } from 'next-auth';
import { UserRole } from '@/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      restaurantId: string;
      restaurantSlug: string;
    } & DefaultSession['user'];
  }

  interface User {
    role: UserRole;
    restaurantId: string;
    restaurantSlug: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole;
    restaurantId: string;
    restaurantSlug: string;
  }
}
