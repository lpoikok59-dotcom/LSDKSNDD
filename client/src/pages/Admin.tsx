import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Tab = "submissions" | "content" | "images";

// ---- Submissions Tab ----
function SubmissionsTab() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const { data, isLoading, refetch } = trpc.admin.listSubmissions.useQuery({ search });
  const deleteMutation = trpc.admin.deleteSubmission.useMutation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const exportCsv = () => {
    if (!data || data.length === 0) { toast.error("沒有資料可匯出"); return; }
    const header = "姓名,電話,IP,提交時間\n";
    const rows = data.map(r => `"${r.name}","${r.phone}","${r.ip}","${new Date(r.createdAt).toLocaleString()}"`).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "submissions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: number, name: string, phone: string) => {
    if (!confirm(`確定要刪除 ${name} (${phone}) 的記錄嗎？此操作無法復原。`)) return;
    setDeleting(id);
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("記錄已刪除");
      refetch();
    } catch {
      toast.error("刪除失敗，請稍後再試");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📋 表單提交記錄</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="搜尋姓名、電話、IP..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, minWidth: 200 }}
            />
            <button type="submit" style={{ padding: "8px 16px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>搜尋</button>
            {search && <button type="button" onClick={() => { setSearch(""); setSearchInput(""); }} style={{ padding: "8px 12px", background: "#eee", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>清除</button>}
          </form>
          <button onClick={exportCsv} style={{ padding: "8px 16px", background: "#2e7d32", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>📥 匯出 CSV</button>
          <button onClick={() => refetch()} style={{ padding: "8px 16px", background: "#1565c0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>🔄 刷新</button>
        </div>
      </div>

      {search && <div style={{ marginBottom: 12, color: "#666", fontSize: 14 }}>搜尋「{search}」的結果，共 {data?.length ?? 0} 筆</div>}

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#888" }}>載入中...</div>
      ) : !data || data.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#888", background: "#f9f9f9", borderRadius: 8 }}>
          {search ? "找不到符合的記錄" : "尚無提交記錄"}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#1a1a1a", color: "#fbc02d" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", whiteSpace: "nowrap" }}>#</th>
                <th style={{ padding: "12px 16px", textAlign: "left", whiteSpace: "nowrap" }}>姓名</th>
                <th style={{ padding: "12px 16px", textAlign: "left", whiteSpace: "nowrap" }}>電話</th>
                <th style={{ padding: "12px 16px", textAlign: "left", whiteSpace: "nowrap" }}>IP 位址</th>
                <th style={{ padding: "12px 16px", textAlign: "left", whiteSpace: "nowrap" }}>提交時間</th>
                <th style={{ padding: "12px 16px", textAlign: "center", whiteSpace: "nowrap" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9f9f9", borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px 16px", color: "#999" }}>{i + 1}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{row.name}</td>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace" }}>{row.phone}</td>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#555" }}>{row.ip}</td>
                  <td style={{ padding: "12px 16px", color: "#666" }}>{new Date(row.createdAt).toLocaleString("zh-TW")}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <button
                      onClick={() => handleDelete(row.id, row.name, row.phone)}
                      disabled={deleting === row.id}
                      style={{ padding: "4px 10px", background: deleting === row.id ? "#ccc" : "#d32f2f", color: "#fff", border: "none", borderRadius: 4, cursor: deleting === row.id ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600 }}
                    >
                      {deleting === row.id ? "刪除中..." : "🗑️ 刪除"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, color: "#888", fontSize: 13 }}>共 {data.length} 筆記錄（電話號碼去重後的唯一記錄）</div>
        </div>
      )}
    </div>
  );
}

// ---- Content Editor Tab ----
function ContentTab() {
  const { data, isLoading, refetch } = trpc.admin.getAllContent.useQuery();
  const updateMutation = trpc.admin.updateContent.useMutation();
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const handleChange = (key: string, value: string) => {
    setEditing(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string, label: string) => {
    const value = editing[key];
    if (value === undefined) return;
    setSaving(key);
    try {
      await updateMutation.mutateAsync({ key, label, value });
      toast.success(`「${label}」已更新`);
      setEditing(prev => { const n = { ...prev }; delete n[key]; return n; });
      refetch();
    } catch {
      toast.error("更新失敗，請稍後再試");
    } finally {
      setSaving(null);
    }
  };

  const handleReset = (key: string) => {
    setEditing(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  if (isLoading) return <div style={{ textAlign: "center", padding: 40, color: "#888" }}>載入中...</div>;

  return (
    <div>
      <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>✏️ 落地頁文字編輯</h2>
      <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>修改後點擊「儲存」即可即時更新落地頁顯示內容。</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {data?.map(item => {
          const currentValue = editing[item.key] !== undefined ? editing[item.key] : item.value;
          const isDirty = editing[item.key] !== undefined;
          const isMultiline = item.value.includes("\n") || item.value.length > 80;
          return (
            <div key={item.key} style={{ background: "#fff", border: isDirty ? "2px solid #fbc02d" : "1px solid #eee", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontWeight: 600, fontSize: 15, color: "#1a1a1a" }}>{item.label}</label>
                <span style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>{item.key}</span>
              </div>
              {isMultiline ? (
                <textarea
                  value={currentValue}
                  onChange={e => handleChange(item.key, e.target.value)}
                  rows={4}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              ) : (
                <input
                  type="text"
                  value={currentValue}
                  onChange={e => handleChange(item.key, e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }}
                />
              )}
              {isDirty && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => handleSave(item.key, item.label)}
                    disabled={saving === item.key}
                    style={{ padding: "8px 20px", background: "#d32f2f", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
                  >
                    {saving === item.key ? "儲存中..." : "💾 儲存"}
                  </button>
                  <button onClick={() => handleReset(item.key)} style={{ padding: "8px 16px", background: "#eee", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>取消</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Image Manager Tab ----
function ImagesTab() {
  const { data, isLoading, refetch } = trpc.admin.getAllImages.useQuery();
  const uploadMutation = trpc.admin.uploadImage.useMutation();
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleUpload = async (key: string, label: string, file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("圖片大小不能超過 10MB"); return; }
    setUploading(key);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadMutation.mutateAsync({ key, label, base64, mimeType: file.type, filename: file.name });
      toast.success(`「${label}」圖片已更新`);
      refetch();
    } catch {
      toast.error("上傳失敗，請稍後再試");
    } finally {
      setUploading(null);
    }
  };

  if (isLoading) return <div style={{ textAlign: "center", padding: 40, color: "#888" }}>載入中...</div>;

  return (
    <div>
      <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>🖼️ 落地頁圖片管理</h2>
      <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>點擊「更換圖片」上傳新圖片，即時替換落地頁中的對應圖片。支援 JPG、PNG、WebP、GIF 格式，最大 10MB。</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
        {data?.map(item => (
          <div key={item.key} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ position: "relative", background: "#f0f0f0", aspectRatio: "16/9", overflow: "hidden" }}>
              <img
                src={item.url}
                alt={item.label}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {uploading === item.key && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14 }}>
                  上傳中...
                </div>
              )}
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace", marginBottom: 10 }}>{item.key}</div>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                ref={el => { fileRefs.current[item.key] = el; }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(item.key, item.label, file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileRefs.current[item.key]?.click()}
                disabled={uploading === item.key}
                style={{ width: "100%", padding: "8px 0", background: uploading === item.key ? "#ccc" : "#1a1a1a", color: "#fff", border: "none", borderRadius: 6, cursor: uploading === item.key ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600 }}
              >
                {uploading === item.key ? "上傳中..." : "📤 更換圖片"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Main Admin Page ----
export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("submissions");
  const loginMutation = trpc.adminAuth.login.useMutation();
  const logoutMutation = trpc.adminAuth.logout.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) { toast.error("請輸入密碼"); return; }
    try {
      await loginMutation.mutateAsync({ password: password.trim() });
      setIsLoggedIn(true);
      setPassword("");
      toast.success("登入成功");
    } catch (err: any) {
      toast.error(err?.message || "登入失敗");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setIsLoggedIn(false);
      toast.success("已登出");
    } catch {
      toast.error("登出失敗");
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif' }}>
        <div style={{ background: "#fff", padding: 40, borderRadius: 12, textAlign: "center", maxWidth: 380, width: "90%" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
          <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 700 }}>後台管理系統</h1>
          <p style={{ color: "#666", marginBottom: 24, fontSize: 14 }}>請輸入管理員密碼以存取後台</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="輸入密碼"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 16, marginBottom: 16, boxSizing: "border-box" }}
            />
            <button
              type="submit"
              disabled={loginMutation.isPending}
              style={{ width: "100%", padding: "12px 0", background: "#d32f2f", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 16, cursor: "pointer" }}
            >
              {loginMutation.isPending ? "登入中..." : "登入"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "submissions", label: "📋 表單記錄" },
    { key: "content", label: "✏️ 文字編輯" },
    { key: "images", label: "🖼️ 圖片管理" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f4", fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif' }}>
      {/* Top Nav */}
      <div style={{ background: "#1a1a1a", color: "#fff", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: "#fbc02d" }}>🏆 霸王後台管理</span>
          <a href="/" style={{ color: "#aaa", textDecoration: "none", fontSize: 13 }} target="_blank" rel="noopener noreferrer">← 查看落地頁</a>
        </div>
        <button
          onClick={handleLogout}
          style={{ padding: "6px 14px", background: "#333", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
        >
          登出
        </button>
      </div>

      {/* Tab Bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 20px", display: "flex", gap: 0, overflowX: "auto" }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "16px 24px", border: "none", background: "transparent", cursor: "pointer",
              fontSize: 15, fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? "#d32f2f" : "#555",
              borderBottom: tab === t.key ? "3px solid #d32f2f" : "3px solid transparent",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "30px 20px" }}>
        {tab === "submissions" && <SubmissionsTab />}
        {tab === "content" && <ContentTab />}
        {tab === "images" && <ImagesTab />}
      </div>
    </div>
  );
}
