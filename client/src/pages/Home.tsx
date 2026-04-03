import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const FAKE_NAMES = ['王*德', '李*榮', '陳*廷', '張*豪', '林*宏', '吳*成', '蔡*志', '黃*文', '許*睿', '郭*賢'];
const FAKE_CITIES = ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市', '新竹縣', '彰化縣', '屏東縣', '宜蘭縣'];
const FAKE_PRODUCTS = ['1瓶裝', '2瓶裝', '3瓶裝'];

function useCountdown(seconds: number) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(t => (t <= 0 ? seconds : t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);
  const m = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const s = String(timeLeft % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function FakeOrderPopup() {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  useEffect(() => {
    const show = () => {
      const name = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
      const city = FAKE_CITIES[Math.floor(Math.random() * FAKE_CITIES.length)];
      const product = FAKE_PRODUCTS[Math.floor(Math.random() * FAKE_PRODUCTS.length)];
      const time = Math.floor(Math.random() * 10) + 1;
      setText(`${time}分鐘前，${city}的${name}已訂購 ${product}`);
      setVisible(true);
      setTimeout(() => setVisible(false), 5000);
    };
    const t1 = setTimeout(show, 3000);
    const interval = setInterval(show, 15000);
    return () => { clearTimeout(t1); clearInterval(interval); };
  }, []);

  return (
    <div
      style={{
        position: "fixed", top: 20, left: 10, zIndex: 1000,
        background: "rgba(0,0,0,0.82)", color: "#fff",
        padding: "8px 15px", borderRadius: 30, fontSize: 13,
        display: visible ? "flex" : "none", alignItems: "center",
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
        animation: visible ? "fadeInOut 5s ease" : "none",
        maxWidth: "calc(100vw - 20px)",
      }}
    >
      <img
        src="https://www.freeiconspng.com/uploads/success-icon-10.png"
        alt=""
        style={{ width: 25, height: 25, borderRadius: "50%", marginRight: 10, display: "inline-block" }}
      />
      <span>{text}</span>
    </div>
  );
}

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userIp, setUserIp] = useState("0.0.0.0");
  const formRef = useRef<HTMLDivElement>(null);
  const timer = useCountdown(15 * 60);

  const { data: content } = trpc.landing.getContent.useQuery();
  const { data: images } = trpc.landing.getImages.useQuery();
  const submitMutation = trpc.landing.submit.useMutation();

  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then(r => r.json())
      .then(d => setUserIp(d.ip))
      .catch(() => {});
  }, []);

  const c = (key: string, fallback: string) => content?.[key] ?? fallback;
  const img = (key: string, fallback: string) => images?.[key] ?? fallback;

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("請填寫您的真實姓名"); return; }
    if (!phone.trim() || !/^[0-9]{8,}$/.test(phone.trim())) { toast.error("請輸入正確的手機號碼"); return; }
    setSubmitting(true);
    try {
      const result = await submitMutation.mutateAsync({ name: name.trim(), phone: phone.trim(), ip: userIp });
      if (result.duplicate) {
        toast.info("您的電話號碼已登記過，客服將盡快與您聯繫！");
      } else {
        toast.success("名額預留成功！客服專員稍後將與您電話聯繫說明方案並確認地址，請保持手機暢通！");
        setSubmitted(true);
        setName("");
        setPhone("");
      }
    } catch (err: any) {
      toast.error(err?.message || "提交失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif', margin: 0, padding: 0, background: "#f4f4f4", color: "#333", lineHeight: 1.5 }}>
      <style>{`
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); } }
        @keyframes fadeInOut { 0% { opacity:0; transform:translateY(-20px); } 10% { opacity:1; transform:translateY(0); } 90% { opacity:1; transform:translateY(0); } 100% { opacity:0; transform:translateY(-20px); } }
        .pulse-btn { animation: pulse 1.5s infinite; }
        .container-lp { max-width: 640px; margin: 0 auto; background: #fff; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .lp-img { width: 100%; display: block; height: auto; margin: 0; padding: 0; }
        .tw-title-box { padding: 25px 18px; background: #fff; text-align: center; border-bottom: 3px solid #8B0000; }
        .tw-title-box h1 { font-size: 24px; color: #1a1a1a; margin: 0; line-height: 1.4; font-weight: 900; }
        .badge-box { display: flex; justify-content: center; gap: 8px; margin-top: 15px; flex-wrap: wrap; }
        .badge-item { font-size: 11px; background: #f8f8f8; color: #666; padding: 3px 8px; border-radius: 4px; border: 1px solid #eee; }
        .promo-block { background: #fff; margin: 10px; padding: 15px; border-radius: 10px; border: 1px solid #eee; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; }
        .promo-left { flex: 1; }
        .price-label { font-size: 14px; color: #666; margin-bottom: 2px; }
        .current-price { color: #d32f2f; font-size: 32px; font-weight: 900; }
        .old-price { color: #999; text-decoration: line-through; font-size: 16px; margin-left: 8px; }
        .promo-right { text-align: center; padding-left: 15px; border-left: 1px solid #eee; }
        .stock-tag { font-size: 12px; color: #ff4d4d; font-weight: bold; margin-bottom: 5px; }
        .timer-text { font-size: 11px; color: #888; margin-top: 5px; }
        .jump-btn { display: inline-block; background: #d32f2f; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; padding: 10px 20px; font-size: 16px; box-shadow: 0 4px 8px rgba(211,47,47,0.3); cursor: pointer; border: none; }
        .order-area { background: #1a1a1a; color: #fff; padding: 35px 20px; border-top: 5px solid #fbc02d; }
        .order-title { text-align: center; color: #fbc02d; margin-bottom: 10px; font-size: 24px; font-weight: bold; }
        .trust-icons { display: flex; justify-content: space-around; margin-bottom: 25px; padding: 15px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .trust-item { text-align: center; font-size: 12px; color: #fbc02d; }
        .trust-item i { display: block; font-style: normal; font-size: 24px; margin-bottom: 5px; }
        .order-price-info { text-align: center; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; margin-bottom: 25px; border: 1px dashed #fbc02d; white-space: pre-line; }
        .order-price-info span { color: #fbc02d; font-size: 20px; font-weight: bold; }
        .input-group { margin-bottom: 20px; }
        .input-group label { display: block; margin-bottom: 10px; color: #ddd; font-weight: bold; font-size: 16px; }
        .input-group input { width: 100%; height: 55px; border-radius: 8px; border: none; padding-left: 15px; font-size: 18px; box-sizing: border-box; }
        .submit-btn { width: 100%; height: 70px; background: linear-gradient(180deg, #ff7043, #d32f2f); color: white; border: none; border-radius: 8px; font-size: 24px; font-weight: bold; cursor: pointer; margin-top: 10px; }
        #floating-btn { position: fixed; bottom: 20px; right: 20px; background: #d32f2f; color: white; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 999; font-size: 18px; cursor: pointer; border: none; }
        @media (max-width: 480px) { .tw-title-box h1 { font-size: 20px; } .current-price { font-size: 26px; } .order-title { font-size: 20px; } .submit-btn { font-size: 20px; } #floating-btn { font-size: 15px; padding: 12px 20px; } }
      `}</style>

      <FakeOrderPopup />

      <div className="container-lp">
        <img className="lp-img" src={img("hero", "")} alt="產品首圖" />

        <div className="tw-title-box">
          <h1>
            {c("product_title", "【找回硬實力】霸王養精蓄力丹")}
            <br />
            <span style={{ fontSize: 18, color: "#d32f2f" }}>{c("product_subtitle", "傳承古法漢方精粹，重拾男人巔峰自信！")}</span>
          </h1>
          <div className="badge-box">
            <span className="badge-item">{c("badge1", "🛡️ SGS檢驗合格")}</span>
            <span className="badge-item">{c("badge2", "🌿 100%漢方無西藥")}</span>
            <span className="badge-item">{c("badge3", "🏭 官方正品保證")}</span>
          </div>
        </div>

        <div className="promo-block">
          <div className="promo-left">
            <div className="price-label">{c("price_label", "官方授權正品 (1瓶裝)")}</div>
            <div>
              <span className="current-price">{c("current_price", "1398 TWD")}</span>
              <span className="old-price">{c("old_price", "2778 TWD")}</span>
            </div>
            <div style={{ fontSize: 12, color: "#d32f2f", marginTop: 5 }}>{c("stock_limit", "⚠️ ※ 每人限購 3 瓶，名額有限")}</div>
          </div>
          <div className="promo-right">
            <div className="stock-tag">僅剩最後 <span id="stock-count">7</span> 組</div>
            <button className="jump-btn pulse-btn" onClick={scrollToForm}>{c("cta_btn", "搶先登記優惠")}</button>
            <div className="timer-text">優惠倒計時 <span>{timer}</span></div>
          </div>
        </div>

        <img className="lp-img" src={img("img1", "")} alt="" />
        <img className="lp-img" src={img("img2", "")} alt="" />
        <img className="lp-img" src={img("img3", "")} alt="" />
        <img className="lp-img" src={img("img4", "")} alt="" />
        <img className="lp-img" src={img("img5", "")} alt="" />
        <img className="lp-img" src={img("img6", "")} alt="" />
        <img className="lp-img" src={img("img7", "")} alt="" />
        <img className="lp-img" src={img("img16", "")} alt="" />
        <img className="lp-img" src={img("img8", "")} alt="" />
        <img className="lp-img" src={img("img9", "")} alt="" />
        <img className="lp-img" src={img("img10", "")} alt="" />
        <img className="lp-img" src={img("img11", "")} alt="" />
        <img className="lp-img" src={img("img12", "")} alt="" />
        <img className="lp-img" src={img("img13", "")} alt="" />
        <img className="lp-img" src={img("img14", "")} alt="" />
        <img className="lp-img" src={img("img17", "")} alt="" />
        <img className="lp-img" src={img("img15", "")} alt="" />

        <div className="order-area" ref={formRef} id="order-form">
          <div className="order-title">{c("order_title", "🎁 限時 5 折！僅限前 50 名預留")}</div>
          <div style={{ textAlign: "center", color: "#fbc02d", fontSize: 14, marginBottom: 15 }}>
            {c("order_subtitle", "( 登記後客服將與您確認地址，確認後才發貨 )")}
          </div>

          <div className="trust-icons">
            <div className="trust-item"><i>🚚</i>免運費</div>
            <div className="trust-item"><i>💵</i>貨到付款</div>
            <div className="trust-item"><i>🔒</i>隱私包裝</div>
            <div className="trust-item"><i>🛡️</i>正品保證</div>
          </div>

          <div className="order-price-info">
            {c("order_plan", "當前方案：霸王養精蓄力丹1瓶裝\n結帳金額：1398 TWD (免運費)")}
          </div>

          {submitted ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#fbc02d", fontSize: 18, fontWeight: "bold" }}>
              ✅ 名額預留成功！<br />
              <span style={{ fontSize: 14, color: "#ddd", fontWeight: "normal", display: "block", marginTop: 10 }}>
                客服專員稍後將與您電話聯繫，請保持手機暢通！
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>收貨人姓名：</label>
                <input
                  type="text"
                  id="custName"
                  placeholder="請填寫您的真實姓名"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>聯繫電話：</label>
                <input
                  type="tel"
                  id="userPhone"
                  placeholder="請輸入手機號碼（例：0912345678）"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                  required
                />
              </div>
              <div style={{ marginBottom: 25, fontSize: 14, color: "#bbb", textAlign: "center", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {c("privacy_note", "🔒 隱私保護：包裹面單不顯示產品名稱\n✅ 提交後客服將與您致電核對地址，請留意電話")}
              </div>
              <button type="submit" className="submit-btn pulse-btn" id="submitBtn" disabled={submitting}>
                {submitting ? "登記處理中..." : c("submit_btn", "搶先預留優惠名額")}
              </button>
              <div style={{ marginTop: 15, padding: 10, border: "1px solid #444", borderRadius: 5, fontSize: 13, color: "#888", textAlign: "center" }}>
                ℹ️ {c("footer_note", "溫馨提示：登記後不代表立即扣款。專業老師將先致電為您說明調理方案，若電話未接通將自動取消優惠名額。")}
              </div>
            </form>
          )}
        </div>

        <div style={{ padding: "30px 15px", textAlign: "center", color: "#888", fontSize: 12, background: "#f4f4f4", lineHeight: 1.8, whiteSpace: "pre-line" }}>
          {c("footer_legal", "霸王養精蓄力丹台灣官方唯一通路\n桃市中藥廣字第1091200001號 | 衛署成製字第005101號\n本產品為漢方營養補充，效果因人而異")}
        </div>
      </div>

      <button id="floating-btn" className="pulse-btn" onClick={scrollToForm}>
        {c("floating_btn", "領取 5 折名額")}
      </button>
    </div>
  );
}
