import type { Request, Response } from "express";
export declare const googleConnectController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const googleSigninStart: (req: Request, res: Response) => Promise<void | Response<any, Record<string, any>>>;
export declare const googleCallbackController: (req: Request, res: Response) => Promise<void>;
export declare const googleStatusController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const googleDisconnectController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exchangeLoginCode: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=google-integration.controller.d.ts.map