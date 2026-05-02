export interface User {
  id: string;
  email: string;
  usdtBalance: number;
  usdtLocked: number;
  countryCode: string | null;
  createdAt: Date;
}
