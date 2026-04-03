import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  createSubmission: vi.fn(),
  listSubmissions: vi.fn(),
  getAllPageContent: vi.fn(),
  upsertPageContent: vi.fn(),
  seedPageContent: vi.fn(),
  getAllPageImages: vi.fn(),
  upsertPageImage: vi.fn(),
  seedPageImages: vi.fn(),
  verifyAdminPassword: vi.fn(),
  setAdminPassword: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import * as db from "./db";
import * as storage from "./storage";

function createPublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminCtx(withValidToken: boolean = true): TrpcContext {
  const headers = withValidToken ? { cookie: "admin_session=valid_token_here" } : {};
  return {
    user: null,
    req: { protocol: "https", headers } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("landing.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a new submission and returns duplicate: false", async () => {
    const mockSubmission = { id: 1, name: "王小明", phone: "0912345678", ip: "1.2.3.4", createdAt: new Date() };
    vi.mocked(db.createSubmission).mockResolvedValue({ duplicate: false, submission: mockSubmission });

    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.landing.submit({ name: "王小明", phone: "0912345678", ip: "1.2.3.4" });

    expect(result.duplicate).toBe(false);
    expect(db.createSubmission).toHaveBeenCalledWith({ name: "王小明", phone: "0912345678", ip: "1.2.3.4" });
  });

  it("returns duplicate: true when phone already exists", async () => {
    const existingSubmission = { id: 1, name: "王小明", phone: "0912345678", ip: "1.2.3.4", createdAt: new Date() };
    vi.mocked(db.createSubmission).mockResolvedValue({ duplicate: true, submission: existingSubmission });

    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.landing.submit({ name: "李大華", phone: "0912345678", ip: "5.6.7.8" });

    expect(result.duplicate).toBe(true);
  });

  it("rejects invalid phone number (non-numeric)", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.landing.submit({ name: "王小明", phone: "abc-def", ip: "1.2.3.4" })
    ).rejects.toThrow();
  });

  it("rejects empty name", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.landing.submit({ name: "", phone: "0912345678", ip: "1.2.3.4" })
    ).rejects.toThrow();
  });

  it("rejects phone shorter than 8 digits", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.landing.submit({ name: "王小明", phone: "0912", ip: "1.2.3.4" })
    ).rejects.toThrow();
  });
});

describe("adminAuth.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts correct password and sets session cookie", async () => {
    vi.mocked(db.verifyAdminPassword).mockResolvedValue(true);

    const ctx = createPublicCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.adminAuth.login({ password: "123456" });

    expect(result.success).toBe(true);
    expect(db.verifyAdminPassword).toHaveBeenCalledWith("123456");
    expect(ctx.res.setHeader).toHaveBeenCalled();
  });

  it("rejects incorrect password", async () => {
    vi.mocked(db.verifyAdminPassword).mockResolvedValue(false);

    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.adminAuth.login({ password: "wrongpassword" })
    ).rejects.toThrow("密碼錯誤");
  });
});

describe("admin.listSubmissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns submissions for authenticated admin", async () => {
    const mockData = [
      { id: 1, name: "王小明", phone: "0912345678", ip: "1.2.3.4", createdAt: new Date() },
      { id: 2, name: "李大華", phone: "0987654321", ip: "5.6.7.8", createdAt: new Date() },
    ];
    vi.mocked(db.listSubmissions).mockResolvedValue(mockData);

    const caller = appRouter.createCaller(createAdminCtx(true));
    const result = await caller.admin.listSubmissions({ search: "" });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("王小明");
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createAdminCtx(false));
    await expect(caller.admin.listSubmissions({ search: "" })).rejects.toThrow("未登入");
  });
});

describe("admin.updateContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows authenticated admin to update page content", async () => {
    vi.mocked(db.upsertPageContent).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createAdminCtx(true));
    const result = await caller.admin.updateContent({ key: "product_title", label: "產品標題", value: "新標題" });

    expect(result.success).toBe(true);
    expect(db.upsertPageContent).toHaveBeenCalledWith("product_title", "產品標題", "新標題");
  });

  it("rejects unauthenticated users from updating content", async () => {
    const caller = appRouter.createCaller(createAdminCtx(false));
    await expect(
      caller.admin.updateContent({ key: "product_title", label: "產品標題", value: "新標題" })
    ).rejects.toThrow("未登入");
  });
});

describe("admin.uploadImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows authenticated admin to upload and replace an image", async () => {
    vi.mocked(storage.storagePut).mockResolvedValue({ key: "test-key", url: "https://cdn.example.com/new-image.jpg" });
    vi.mocked(db.upsertPageImage).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createAdminCtx(true));
    const result = await caller.admin.uploadImage({
      key: "hero",
      label: "首圖",
      base64: Buffer.from("fake-image-data").toString("base64"),
      mimeType: "image/jpeg",
      filename: "hero.jpg",
    });

    expect(result.url).toBe("https://cdn.example.com/new-image.jpg");
    expect(storage.storagePut).toHaveBeenCalled();
    expect(db.upsertPageImage).toHaveBeenCalledWith("hero", "首圖", "https://cdn.example.com/new-image.jpg");
  });

  it("rejects unauthenticated users from uploading images", async () => {
    const caller = appRouter.createCaller(createAdminCtx(false));
    await expect(
      caller.admin.uploadImage({ key: "hero", label: "首圖", base64: "abc", mimeType: "image/jpeg", filename: "hero.jpg" })
    ).rejects.toThrow("未登入");
  });
});
