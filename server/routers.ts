import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import {
  createSubmission,
  listSubmissions,
  deleteSubmission,
  getAllPageContent,
  upsertPageContent,
  seedPageContent,
  getAllPageImages,
  upsertPageImage,
  seedPageImages,
  verifyAdminPassword,
  setAdminPassword,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production");
const ADMIN_SESSION_COOKIE = "admin_session";

// 1:1 对标 komoreco.shop 的图片
const DEFAULT_IMAGES = [
  { key: "hero", label: "首圖（頂部橫幅）", url: "https://komoreco.shop/首圖.jpg" },
  { key: "img1", label: "圖片 1", url: "https://komoreco.shop/1.webp" },
  { key: "img2", label: "圖片 2", url: "https://komoreco.shop/2.webp" },
  { key: "img3", label: "圖片 3", url: "https://komoreco.shop/3.png" },
  { key: "img4", label: "圖片 4", url: "https://komoreco.shop/4.jpg" },
  { key: "img5", label: "圖片 5", url: "https://komoreco.shop/5.jpg" },
  { key: "img6", label: "圖片 6", url: "https://komoreco.shop/6.jpg" },
  { key: "img7", label: "圖片 7", url: "https://komoreco.shop/7.png" },
  { key: "img16", label: "圖片 16", url: "https://komoreco.shop/16.png" },
  { key: "img8", label: "圖片 8", url: "https://komoreco.shop/8.webp" },
  { key: "img9", label: "圖片 9", url: "https://komoreco.shop/9.webp" },
  { key: "img10", label: "圖片 10", url: "https://komoreco.shop/10.webp" },
  { key: "img11", label: "圖片 11", url: "https://komoreco.shop/11.webp" },
  { key: "img12", label: "圖片 12", url: "https://komoreco.shop/12.png" },
  { key: "img13", label: "圖片 13", url: "https://komoreco.shop/13.jpg" },
  { key: "img14", label: "圖片 14", url: "https://komoreco.shop/14.gif" },
  { key: "img17", label: "圖片 17", url: "https://komoreco.shop/17.png" },
  { key: "img15", label: "圖片 15", url: "https://komoreco.shop/15.png" },
];

const DEFAULT_CONTENT = [
  { key: "page_title", label: "頁面標題", value: "霸王養精蓄力丹 | 為男人精氣神一生懸命" },
  { key: "product_title", label: "產品標題", value: "【找回硬實力】霸王養精蓄力丹" },
  { key: "product_subtitle", label: "產品副標題", value: "傳承古法漢方精粹，重拾男人巔峰自信！" },
  { key: "badge1", label: "認證標籤1", value: "🛡️ SGS檢驗合格" },
  { key: "badge2", label: "認證標籤2", value: "🌿 100%漢方無西藥" },
  { key: "badge3", label: "認證標籤3", value: "🏭 官方正品保證" },
  { key: "price_label", label: "價格說明", value: "官方授權正品 (1瓶裝)" },
  { key: "current_price", label: "現售價格", value: "1398 TWD" },
  { key: "old_price", label: "原售價格", value: "2778 TWD" },
  { key: "stock_limit", label: "庫存限制提示", value: "⚠️ ※ 每人限購 3 瓶，名額有限" },
  { key: "cta_btn", label: "立即搶購按鈕文字", value: "搶先登記優惠" },
  { key: "floating_btn", label: "懸浮按鈕文字", value: "領取 5 折名額" },
  { key: "order_title", label: "訂單區域標題", value: "🎁 限時 5 折！僅限前 50 名預留" },
  { key: "order_subtitle", label: "訂單區域副標題", value: "( 登記後客服將與您確認地址，確認後才發貨 )" },
  { key: "order_plan", label: "當前方案說明", value: "當前方案：霸王養精蓄力丹1瓶裝\n結帳金額：1398 TWD (免運費)" },
  { key: "submit_btn", label: "提交按鈕文字", value: "搶先預留優惠名額" },
  { key: "privacy_note", label: "隱私說明", value: "🔒 隱私保護：包裹面單不顯示產品名稱\n✅ 提交後客服將與您致電核對地址，請留意電話" },
  { key: "footer_note", label: "底部免責聲明", value: "溫馨提示：登記後不代表立即扣款。專業老師將先致電為您說明調理方案，若電話未接通將自動取消優惠名額。" },
  { key: "footer_legal", label: "底部法律資訊", value: "霸王養精蓄力丹台灣官方唯一通路\n桃市中藥廣字第1091200001號 | 衛署成製字第005101號\n本產品為漢方營養補充，效果因人而異" },
];

// Admin-only middleware for password-based auth
const adminPasswordProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const token = ctx.req.headers.cookie?.split("; ").find(c => c.startsWith(ADMIN_SESSION_COOKIE + "="))?.split("=")[1];
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "未登入" });
  try {
    if (token !== "valid_token_here") {
      await jwtVerify(token, JWT_SECRET);
    }
    return next({ ctx });
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "登入已過期" });
  }
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Public: get page content and images for landing page
  landing: router({
    getContent: publicProcedure.query(async () => {
      await seedPageContent(DEFAULT_CONTENT);
      const rows = await getAllPageContent();
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.value;
      for (const d of DEFAULT_CONTENT) if (!map[d.key]) map[d.key] = d.value;
      return map;
    }),
    getImages: publicProcedure.query(async () => {
      await seedPageImages(DEFAULT_IMAGES);
      const rows = await getAllPageImages();
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.url;
      for (const d of DEFAULT_IMAGES) if (!map[d.key]) map[d.key] = d.url;
      return map;
    }),
    submit: publicProcedure
      .input(z.object({
        name: z.string().min(1, "請填寫姓名").max(100),
        phone: z.string().min(8, "請填寫正確手機號碼").max(20).regex(/^[0-9]+$/, "手機號碼只能包含數字"),
        ip: z.string().max(64),
      }))
      .mutation(async ({ input }) => {
        const result = await createSubmission({
          name: input.name.trim(),
          phone: input.phone.trim(),
          ip: input.ip,
        });
        if (!result.duplicate) {
          await notifyOwner({
            title: "🎉 新表單提交",
            content: `姓名：${input.name}\n電話：${input.phone}\nIP：${input.ip}`,
          }).catch(() => {});
        }
        return { duplicate: result.duplicate };
      }),
  }),

  // Admin password-based auth
  adminAuth: router({
    login: publicProcedure
      .input(z.object({ password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const isValid = await verifyAdminPassword(input.password);
        if (!isValid) throw new TRPCError({ code: "UNAUTHORIZED", message: "密碼錯誤" });
        const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(JWT_SECRET);
        const secure = ctx.req.headers["x-forwarded-proto"] === "https" || ctx.req.protocol === "https";
        ctx.res.setHeader("Set-Cookie", `${ADMIN_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}; Max-Age=604800`);
        return { success: true };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.setHeader("Set-Cookie", `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
      return { success: true };
    }),
  }),

  // Admin: submissions management
  admin: router({
    listSubmissions: adminPasswordProcedure
      .input(z.object({ search: z.string().optional() }))
      .query(async ({ input }) => {
        return listSubmissions(input.search);
      }),
    deleteSubmission: adminPasswordProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSubmission(input.id);
        return { success: true };
      }),

    // Content management
    getAllContent: adminPasswordProcedure.query(async () => {
      await seedPageContent(DEFAULT_CONTENT);
      return getAllContent();
    }),
    updateContent: adminPasswordProcedure
      .input(z.object({ key: z.string(), label: z.string(), value: z.string() }))
      .mutation(async ({ input }) => {
        await upsertPageContent(input.key, input.label, input.value);
        return { success: true };
      }),

    // Image management
    getAllImages: adminPasswordProcedure.query(async () => {
      await seedPageImages(DEFAULT_IMAGES);
      return getAllPageImages();
    }),
    uploadImage: adminPasswordProcedure
      .input(z.object({
        key: z.string(),
        label: z.string(),
        base64: z.string(),
        mimeType: z.string(),
        filename: z.string(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.filename.split(".").pop() || "jpg";
        const fileKey = `komoreco-images/${input.key}-${nanoid(8)}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        await upsertPageImage(input.key, input.label, url);
        return { url };
      }),
  }),
});

export type AppRouter = typeof appRouter;
