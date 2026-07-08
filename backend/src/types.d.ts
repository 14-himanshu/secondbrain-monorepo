// Issue #10 FIX: Declare Express Request augmentation in a dedicated types file
// so all files see it without needing @ts-ignore.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
