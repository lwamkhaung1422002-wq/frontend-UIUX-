import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import PriceChangeRoundedIcon from "@mui/icons-material/PriceChangeRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import EditCalendarRoundedIcon from "@mui/icons-material/EditCalendarRounded";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { useAppHeaderActions } from "../contexts/AppHeaderActionsContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";
import { useFeedback } from "../contexts/FeedbackContext.jsx";
import { api } from "../services/api.js";
import useSessionState from "../hooks/useSessionState.js";

const fallbackProducts = [
  {
    id: 1,
    name: "Jasmine အနံ့ဆီ",
    category: "အလှကုန်",
    supplier: "Pahtama Group",
    sku: "1001",
    price: 3500,
    cost: 2900,
    quantity: 68,
  },
  {
    id: 2,
    name: "Nivea Roll on",
    category: "အလှကုန်",
    supplier: "Pahtama Group",
    sku: "1002",
    price: 6500,
    cost: 5800,
    quantity: 29,
  },
  {
    id: 3,
    name: "Coca-Cola 330ml",
    category: "အအေး",
    supplier: "Unilever",
    sku: "1228",
    price: 1000,
    cost: 800,
    quantity: 20,
  },
  {
    id: 4,
    name: "ကွမ်းယာ",
    category: "အထွေထွေ",
    supplier: "Pahtama Group",
    sku: "1004",
    price: 5000,
    cost: 4300,
    quantity: 2,
  },
];
const money = (value) => `${Number(value || 0).toLocaleString("en-US")} ကျပ်`;
const today = () => new Date().toISOString().slice(0, 10);
const monthRange = () => {
  const date = new Date();
  return {
    from: new Date(date.getFullYear(), date.getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    to: new Date(date.getFullYear(), date.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10),
  };
};
const stamp = () =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: true,
  }).format(new Date());
const priceDraftDefault = {
  scope: "overall",
  margin: "",
  category: "",
  product: null,
  sellPrice: "",
  reason: "",
};
const promotionDraftDefault = {
  scope: "overall",
  category: "",
  products: [],
  name: "",
  type: "percent",
  value: "",
  minimumQuantity: "1",
  startsAt: today(),
  endsAt: today(),
  note: "",
};
const initialPriceRecords = [
  {
    id: "price-demo-1",
    date: today(),
    changedAt: `${today()} · 9:30 am`,
    sku: "1001",
    name: "Jasmine အနံ့ဆီ",
    category: "အလှကုန်",
    oldPrice: 3200,
    newPrice: 3500,
    scope: "ကုန်ပစ္စည်းတစ်မျိုး",
    reason: "ဝယ်စျေးပြောင်းလဲမှုအရ ပြင်ဆင်ခြင်း",
  },
  {
    id: "price-demo-2",
    date: today(),
    changedAt: `${today()} · 9:30 am`,
    sku: "1228",
    name: "Coca-Cola 330ml",
    category: "အအေး",
    oldPrice: 900,
    newPrice: 1000,
    scope: "အမျိုးအစား · အအေး",
    reason: "အမြတ်ရာခိုင်နှုန်း ပြန်သတ်မှတ်ခြင်း",
  },
];
const initialPromotionRecords = [
  {
    id: "promo-demo-1",
    promotionId: "promo-demo-1",
    status: "active",
    date: today(),
    changedAt: `${today()} · 10:00 am`,
    sku: "1002",
    name: "Nivea Roll on",
    category: "အလှကုန်",
    promotionName: "အလှကုန် အထူးလျှော့စျေး",
    scope: "ကုန်ပစ္စည်းတစ်မျိုး",
    type: "percent",
    value: 10,
    startsAt: today(),
    endsAt: today(),
    note: "demo promotion",
    history: [{ type: "သတ်မှတ်ခဲ့သည်", at: `${today()} · 10:00 am` }],
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const { data: shopData, refresh } = useData();
  const { notify } = useFeedback();
  const [previewProducts, setPreviewProducts] = useSessionState(
    "products:demo-items:v2",
    fallbackProducts,
  );
  const categoryNames = useMemo(
    () => new Map((shopData.categories || []).map((category) => [String(category.id), category.name])),
    [shopData.categories],
  );
  const products = useMemo(
    () => user.preview
      ? previewProducts
      : (shopData.products || []).map((product) => ({
          ...product,
          category: product.category?.name || categoryNames.get(String(product.categoryId)) || "အမျိုးအစားမသတ်မှတ်ရသေး",
          quantity: Number(product.quantity || 0),
        })),
    [user.preview, previewProducts, shopData.products, categoryNames],
  );
  const [priceRecords, setPriceRecords] = useSessionState(
    "pricing:demo-price-records:v2",
    initialPriceRecords,
  );
  const [promotionRecords, setPromotionRecords] = useSessionState(
    "pricing:demo-promotion-records:v2",
    initialPromotionRecords,
  );
  const [tab, setTab] = useState(0);
  const [priceDraft, setPriceDraft] = useState(null);
  const [promotionDraft, setPromotionDraft] = useState(null);
  const [promotionPeriodDraft, setPromotionPeriodDraft] = useState(null);
  const [cancelPromotionDraft, setCancelPromotionDraft] = useState(null);
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState(() => monthRange().from);
  const [toDate, setToDate] = useState(() => monthRange().to);
  const setHeaderActions = useAppHeaderActions();
  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))],
    [products],
  );
  const margin = (product) =>
    product.cost
      ? Math.round(((product.price - product.cost) / product.cost) * 100)
      : 0;
  const shownProducts = useMemo(
    () =>
      products.filter((product) =>
        `${product.name} ${product.sku} ${product.category}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [products, query],
  );
  const recordMatches = (record) =>
    (!query.trim() ||
      `${record.name} ${record.sku} ${record.category} ${record.scope}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())) &&
    record.date >= fromDate &&
    record.date <= toDate;
  const shownPriceRecords = priceRecords.filter(recordMatches);
  const shownPromotionRecords = promotionRecords.filter(recordMatches);
  const promotionGroups = useMemo(() => {
    const groups = new Map();
    promotionRecords.forEach((record) => {
      const promotionId = record.promotionId || record.id;
      const group = groups.get(promotionId) || {
        ...record,
        promotionId,
        products: [],
        history: record.history || [],
      };
      group.products.push(record);
      groups.set(promotionId, group);
    });
    return [...groups.values()];
  }, [promotionRecords]);
  const activePromotions = useMemo(
    () =>
      promotionGroups.filter(
        (promotion) =>
          (promotion.status || "active") === "active" &&
          promotion.startsAt <= today() &&
          promotion.endsAt >= today(),
      ),
    [promotionGroups],
  );

  useEffect(() => {
    setHeaderActions(
      <>
        <Button
          className="app-product-setup-action"
          variant="outlined"
          startIcon={<LocalOfferRoundedIcon />}
          onClick={() => setPromotionDraft({ ...promotionDraftDefault })}
        >
          ပရိုမိုးရှင်းသတ်မှတ်မည်
        </Button>
        <Button
          className="app-product-add-action"
          variant="contained"
          startIcon={<PriceChangeRoundedIcon />}
          onClick={() => setPriceDraft({ ...priceDraftDefault })}
        >
          စျေးနှုန်းသတ်မှတ်မည်
        </Button>
      </>,
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  const selectedPriceProducts = () => {
    if (!priceDraft) return [];
    if (priceDraft.scope === "overall") return products;
    if (priceDraft.scope === "category")
      return products.filter(
        (product) => product.category === priceDraft.category,
      );
    return priceDraft.product ? [priceDraft.product] : [];
  };
  const savePrice = async () => {
    const targets = selectedPriceProducts();
    if (
      !targets.length ||
      (priceDraft.scope !== "product" && Number(priceDraft.margin) < 0) ||
      (priceDraft.scope === "product" && Number(priceDraft.sellPrice) <= 0)
    )
      return;
    const changedAt = stamp();
    const next = new Map(
      targets.map((product) => [
        product.id,
        priceDraft.scope === "product"
          ? Number(priceDraft.sellPrice)
          : Math.round(
              product.cost * (1 + Number(priceDraft.margin || 0) / 100),
            ),
      ]),
    );
    if (!user.preview) {
      try {
        await Promise.all(targets.map((product) => api.createPrice(user.shop?.id, {
          productId: product.id,
          unitPrice: next.get(product.id),
          effectiveFrom: new Date(),
          reason: priceDraft.reason || "စျေးနှုန်းပြင်ဆင်ခြင်း",
        })));
        await refresh();
      } catch (error) {
        notify(error.message || "စျေးနှုန်းကို မသိမ်းနိုင်ပါ", "error");
        return;
      }
    } else {
      setPreviewProducts((current) =>
        current.map((product) =>
          next.has(product.id)
            ? { ...product, price: next.get(product.id) }
            : product,
        ),
      );
    }
    setPriceRecords((current) => [
      ...targets.map((product) => ({
        id: `${Date.now()}-${product.id}`,
        date: today(),
        changedAt,
        sku: product.sku,
        name: product.name,
        category: product.category,
        oldPrice: product.price,
        newPrice: next.get(product.id),
        scope:
          priceDraft.scope === "overall"
            ? "ဆိုင်တစ်ခုလုံး"
            : priceDraft.scope === "category"
              ? `အမျိုးအစား · ${priceDraft.category}`
              : "ကုန်ပစ္စည်းတစ်မျိုး",
        reason: priceDraft.reason || "စျေးနှုန်းပြင်ဆင်ခြင်း",
      })),
      ...current,
    ]);
    setPriceDraft(null);
  };
  const promotionTargets = () =>
    !promotionDraft
      ? []
      : promotionDraft.scope === "overall"
        ? products
        : promotionDraft.scope === "category"
          ? products.filter(
              (product) => product.category === promotionDraft.category,
            )
          : promotionDraft.products;
  const savePromotion = async () => {
    const targets = promotionTargets();
    if (
      !promotionDraft.name.trim() ||
      !targets.length ||
      Number(promotionDraft.value) <= 0 ||
      !promotionDraft.startsAt ||
      !promotionDraft.endsAt
    )
      return;
    const changedAt = stamp();
    const promotionId = `promo-${Date.now()}`;
    let persistedPromotions = [];
    if (!user.preview) {
      try {
        persistedPromotions = await Promise.all(targets.map((product) => api.createPromotion(user.shop?.id, {
          productId: product.id,
          name: promotionDraft.name.trim(),
          channel: "POS",
          type: promotionDraft.type === "percent" ? "PERCENTAGE" : "FIXED_PRICE",
          value: Number(promotionDraft.value),
          minimumQuantity: Number(promotionDraft.minimumQuantity || 1),
          discountBase: "REGULAR_PRICE",
          startsAt: new Date(`${promotionDraft.startsAt}T00:00:00+06:30`),
          endsAt: new Date(`${promotionDraft.endsAt}T23:59:59+06:30`),
          timeZone: "Asia/Yangon",
          state: "SCHEDULED",
          priority: 0,
          note: promotionDraft.note || undefined,
          reason: "စျေးနှုန်းနှင့် ပရိုမိုးရှင်းမှ သတ်မှတ်ခြင်း",
        })));
        await refresh();
      } catch (error) {
        notify(error.message || "ပရိုမိုးရှင်းကို မသိမ်းနိုင်ပါ", "error");
        return;
      }
    }
    setPromotionRecords((current) => [
      ...targets.map((product, index) => ({
        id: `${promotionId}-${product.id}`,
        promotionId: user.preview ? promotionId : persistedPromotions[index]?.promotion?.id || promotionId,
        version: user.preview ? 1 : persistedPromotions[index]?.promotion?.version,
        status: "active",
        date: today(),
        changedAt,
        sku: product.sku,
        name: product.name,
        category: product.category,
        promotionName: promotionDraft.name.trim(),
        scope:
          promotionDraft.scope === "overall"
            ? "ဆိုင်တစ်ခုလုံး"
            : promotionDraft.scope === "category"
              ? `အမျိုးအစား · ${promotionDraft.category}`
              : "ရွေးချယ်ကုန်ပစ္စည်း",
        type: promotionDraft.type,
        value: Number(promotionDraft.value),
        minimumQuantity: Number(promotionDraft.minimumQuantity || 1),
        startsAt: promotionDraft.startsAt,
        endsAt: promotionDraft.endsAt,
        note: promotionDraft.note,
        history: [{ type: "သတ်မှတ်ခဲ့သည်", at: changedAt }],
      })),
      ...current,
    ]);
    setPromotionDraft(null);
  };
  const savePromotionPeriod = () => {
    if (
      !promotionPeriodDraft?.startsAt ||
      !promotionPeriodDraft.endsAt ||
      promotionPeriodDraft.endsAt < promotionPeriodDraft.startsAt
    )
      return;
    const changedAt = stamp();
    setPromotionRecords((current) =>
      current.map((record) => {
        if (
          (record.promotionId || record.id) !== promotionPeriodDraft.promotionId
        )
          return record;
        return {
          ...record,
          startsAt: promotionPeriodDraft.startsAt,
          endsAt: promotionPeriodDraft.endsAt,
          changedAt,
          history: [
            ...(record.history || []),
            {
              type: "ကာလပြင်ဆင်ခဲ့သည်",
              at: changedAt,
              startsAt: promotionPeriodDraft.startsAt,
              endsAt: promotionPeriodDraft.endsAt,
            },
          ],
        };
      }),
    );
    setPromotionPeriodDraft(null);
  };
  const cancelPromotion = () => {
    if (!cancelPromotionDraft?.reason.trim()) return;
    const changedAt = stamp();
    setPromotionRecords((current) =>
      current.map((record) => {
        if (
          (record.promotionId || record.id) !== cancelPromotionDraft.promotionId
        )
          return record;
        return {
          ...record,
          status: "cancelled",
          cancelledAt: changedAt,
          cancelReason: cancelPromotionDraft.reason.trim(),
          history: [
            ...(record.history || []),
            {
              type: "ဖျက်သိမ်းခဲ့သည်",
              at: changedAt,
              reason: cancelPromotionDraft.reason.trim(),
            },
          ],
        };
      }),
    );
    setCancelPromotionDraft(null);
  };
  const productPreview =
    priceDraft?.scope === "product" && priceDraft.product
      ? priceDraft.product
      : null;

  return (
    <Box className="page-stack pricing-page">
      <Box className="pricing-intro">
        <Box>
          <Typography variant="h5">စျေးနှုန်းနှင့် ပရိုမိုးရှင်း</Typography>
        </Box>
        <Box className="pricing-intro-badges">
          <Chip
            icon={<PriceChangeRoundedIcon />}
            label={`ကုန်ပစ္စည်း ${products.length} မျိုး`}
            color="success"
          />
          <Chip
            icon={<LocalOfferRoundedIcon />}
            label={`ပရိုမိုးရှင်း ${promotionRecords.length} ခု`}
          />
        </Box>
      </Box>
      <Tabs
        className="pricing-tabs"
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="စျေးနှုန်းသတ်မှတ်ခြင်း" />
        <Tab label="စျေးနှုန်းမှတ်တမ်း" />
        <Tab label="ပရိုမိုးရှင်း" />
        <Tab label="ပရိုမိုးရှင်းမှတ်တမ်း" />
      </Tabs>
      {tab === 0 ? (
        <>
          <Box className="pricing-products-grid">
            {shownProducts.map((product) => (
              <Box key={product.id} className="pricing-product-card">
                <Box>
                  <Typography fontWeight={850}>{product.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {product.sku} · {product.category}
                  </Typography>
                </Box>
                <Box className="pricing-product-values">
                  <Typography>
                    ဝယ်စျေး <b>{money(product.cost)}</b>
                  </Typography>
                  <Typography>
                    ရောင်းစျေး <b>{money(product.price)}</b>
                  </Typography>
                  <Chip
                    size="small"
                    color={margin(product) < 10 ? "warning" : "success"}
                    label={`အမြတ် ${margin(product)}%`}
                  />
                </Box>
                <Button
                  size="small"
                  onClick={() =>
                    setPriceDraft({
                      ...priceDraftDefault,
                      scope: "product",
                      product,
                      sellPrice: product.price,
                    })
                  }
                >
                  စျေးပြင်မည်
                </Button>
              </Box>
            ))}
          </Box>
        </>
      ) : null}
      {[1, 3].includes(tab) ? (
        <>
          <RecordFilters
            query={query}
            setQuery={setQuery}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
          />
          <Box className="pricing-records">
            {(tab === 1 ? shownPriceRecords : shownPromotionRecords).length ? (
              tab === 1 ? (
                shownPriceRecords.map((record) => (
                  <PriceRecord key={record.id} record={record} />
                ))
              ) : (
                shownPromotionRecords.map((record) => (
                  <PromotionRecord key={record.id} record={record} />
                ))
              )
            ) : (
              <Box className="pricing-empty">
                <HistoryRoundedIcon />
                <Typography fontWeight={700}>
                  ရွေးထားသောကာလအတွင်း မှတ်တမ်းမရှိသေးပါ
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  စျေးနှုန်း သို့မဟုတ် ပရိုမိုးရှင်းသတ်မှတ်ပြီးလျှင် ဤနေရာတွင်
                  မှတ်တမ်းတင်မည်။
                </Typography>
              </Box>
            )}
          </Box>
        </>
      ) : null}
      {tab === 2 ? (
        <>
          <Box className="pricing-active-heading sx">
            <Box>
              <Typography variant="h6">
                လက်ရှိအသက်ဝင်နေသော ပရိုမိုးရှင်းများ
              </Typography>
            </Box>
            <Box>
              <Chip
                color="success"
                label={`${activePromotions.length} ခု အသက်ဝင်နေသည်`}
              />
            </Box>
          </Box>
          {activePromotions.length ? (
            <Box className="pricing-active-list">
              {activePromotions.map((promotion) => (
                <ActivePromotionCard
                  key={promotion.promotionId}
                  promotion={promotion}
                  onEditPeriod={() =>
                    setPromotionPeriodDraft({
                      promotionId: promotion.promotionId,
                      name: promotion.promotionName,
                      startsAt: promotion.startsAt,
                      endsAt: promotion.endsAt,
                    })
                  }
                  onCancel={() =>
                    setCancelPromotionDraft({
                      promotionId: promotion.promotionId,
                      name: promotion.promotionName,
                      reason: "",
                    })
                  }
                />
              ))}
            </Box>
          ) : (
            <Box className="pricing-empty">
              <LocalOfferRoundedIcon />
              <Typography fontWeight={700}>
                လက်ရှိအသက်ဝင်နေသော ပရိုမိုးရှင်းမရှိသေးပါ
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ကာလသတ်မှတ်ပြီး ပရိုမိုးရှင်းအသစ်ထည့်သွင်းပါ။
              </Typography>
            </Box>
          )}
          <Box className="pricing-promotion-note">
            <Typography fontWeight={800}>ကာလသတ်မှတ်ခြင်း</Typography>
            <Typography variant="body2">
              စတင်ရက်နှင့် ပြီးဆုံးရက်ကို ဆိုင်ရှင်လိုအပ်သလို ပြင်ဆင်နိုင်ပါသည်။
              ဖျက်သိမ်းထားသော ပရိုမိုးရှင်းသည် အရောင်းတွင် ဆက်မသက်ရောက်တော့ဘဲ
              မှတ်တမ်းတွင် ဆက်ရှိနေမည်။
            </Typography>
          </Box>
        </>
      ) : null}

      <Dialog
        open={Boolean(priceDraft)}
        onClose={() => setPriceDraft(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>ရောင်းစျေးသတ်မှတ်မည်</DialogTitle>
        <DialogContent className="pricing-form">
          <TextField
            select
            label="သတ်မှတ်မည့်အဆင့်"
            value={priceDraft?.scope || "overall"}
            onChange={(event) =>
              setPriceDraft((draft) => ({
                ...draft,
                scope: event.target.value,
                category: "",
                product: null,
                sellPrice: "",
              }))
            }
          >
            <MenuItem value="overall">ဆိုင်တစ်ခုလုံး</MenuItem>
            <MenuItem value="category">ပစ္စည်းအမျိုးအစားအလိုက်</MenuItem>
            <MenuItem value="product">ကုန်ပစ္စည်းတစ်မျိုးချင်းစီ</MenuItem>
          </TextField>
          {priceDraft?.scope === "category" ? (
            <TextField
              required
              select
              label="ပစ္စည်းအမျိုးအစား"
              value={priceDraft.category}
              onChange={(event) =>
                setPriceDraft((draft) => ({
                  ...draft,
                  category: event.target.value,
                }))
              }
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          {priceDraft?.scope === "product" ? (
            <Autocomplete
              options={products}
              value={priceDraft.product}
              getOptionLabel={(product) => `${product.name} (${product.sku})`}
              onChange={(_, product) =>
                setPriceDraft((draft) => ({
                  ...draft,
                  product,
                  sellPrice: product?.price || "",
                }))
              }
              renderInput={(params) => (
                <TextField {...params} label="ကုန်ပစ္စည်းရွေးပါ" />
              )}
            />
          ) : (
            <TextField
              required
              type="number"
              label="အမြတ်ရာခိုင်နှုန်း"
              value={priceDraft?.margin ?? ""}
              onChange={(event) =>
                setPriceDraft((draft) => ({
                  ...draft,
                  margin: event.target.value,
                }))
              }
              helperText="ဝယ်စျေးအပေါ်တွင် ရာခိုင်နှုန်းဖြင့် ရောင်းစျေးတွက်မည်"
            />
          )}
          {priceDraft?.scope === "product" ? (
            <>
              <Typography className="pricing-cost-hint">
                လက်ရှိဝယ်စျေး — {money(productPreview?.cost)} · လက်ရှိရောင်းစျေး
                — {money(productPreview?.price)}
              </Typography>
              <TextField
                required
                type="number"
                label="ရောင်းစျေးအသစ်"
                value={priceDraft?.sellPrice ?? ""}
                onChange={(event) =>
                  setPriceDraft((draft) => ({
                    ...draft,
                    sellPrice: event.target.value,
                  }))
                }
              />
            </>
          ) : null}
          <TextField
            multiline
            minRows={2}
            label="ပြင်ဆင်ရသည့်အကြောင်းပြချက်"
            value={priceDraft?.reason || ""}
            onChange={(event) =>
              setPriceDraft((draft) => ({
                ...draft,
                reason: event.target.value,
              }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPriceDraft(null)}>မလုပ်တော့ပါ</Button>
          <Button
            variant="contained"
            disabled={
              !selectedPriceProducts().length ||
              (priceDraft?.scope === "product"
                ? Number(priceDraft?.sellPrice) <= 0
                : priceDraft?.margin === "")
            }
            onClick={savePrice}
          >
            ရောင်းစျေးသတ်မှတ်မည်
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(promotionDraft)}
        onClose={() => setPromotionDraft(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>ပရိုမိုးရှင်းသတ်မှတ်မည်</DialogTitle>
        <DialogContent className="pricing-form">
          <TextField
            required
            label="ပရိုမိုးရှင်းအမည်"
            value={promotionDraft?.name || ""}
            onChange={(event) =>
              setPromotionDraft((draft) => ({
                ...draft,
                name: event.target.value,
              }))
            }
          />
          <TextField
            select
            label="သတ်မှတ်မည့်အဆင့်"
            value={promotionDraft?.scope || "overall"}
            onChange={(event) =>
              setPromotionDraft((draft) => ({
                ...draft,
                scope: event.target.value,
                category: "",
                products: [],
              }))
            }
          >
            <MenuItem value="overall">ဆိုင်တစ်ခုလုံး</MenuItem>
            <MenuItem value="category">ပစ္စည်းအမျိုးအစားအလိုက်</MenuItem>
            <MenuItem value="choice">ရွေးချယ်ကုန်ပစ္စည်းများ</MenuItem>
          </TextField>
          {promotionDraft?.scope === "category" ? (
            <TextField
              required
              select
              label="ပစ္စည်းအမျိုးအစား"
              value={promotionDraft.category}
              onChange={(event) =>
                setPromotionDraft((draft) => ({
                  ...draft,
                  category: event.target.value,
                }))
              }
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          {promotionDraft?.scope === "choice" ? (
            <Autocomplete
              multiple
              options={products}
              value={promotionDraft.products}
              getOptionLabel={(product) => `${product.name} (${product.sku})`}
              onChange={(_, products) =>
                setPromotionDraft((draft) => ({ ...draft, products }))
              }
              renderInput={(params) => (
                <TextField {...params} label="ကုန်ပစ္စည်းရွေးပါ" />
              )}
            />
          ) : null}
          <TextField
            select
            label="ပရိုမိုးရှင်းအမျိုးအစား"
            value={promotionDraft?.type || "percent"}
            onChange={(event) =>
              setPromotionDraft((draft) => ({
                ...draft,
                type: event.target.value,
              }))
            }
          >
            <MenuItem value="percent">ရာခိုင်နှုန်းလျှော့စျေး</MenuItem>
            <MenuItem value="fixed">ပရိုမိုးရှင်းရောင်းစျေး</MenuItem>
          </TextField>
          <TextField
            required
            type="number"
            label={
              promotionDraft?.type === "percent"
                ? "လျှော့စျေး ရာခိုင်နှုန်း"
                : "ပရိုမိုးရှင်းရောင်းစျေး"
            }
            value={promotionDraft?.value ?? ""}
            onChange={(event) =>
              setPromotionDraft((draft) => ({
                ...draft,
                value: event.target.value,
              }))
            }
          />
          <TextField
            required
            type="number"
            label="Promotion ရရန် အနည်းဆုံးအရေအတွက်"
            value={promotionDraft?.minimumQuantity ?? "1"}
            inputProps={{ min: 1, step: 1 }}
            onChange={(event) =>
              setPromotionDraft((draft) => ({
                ...draft,
                minimumQuantity: event.target.value,
              }))
            }
            helperText="သတ်မှတ်အရေအတွက် ပြည့်မှသာ အရောင်းစာမျက်နှာတွင် လျှော့စျေးကို အလိုအလျောက်တွက်မည်"
          />
          <Box className="pricing-date-row">
            <TextField
              required
              type="date"
              label="စတင်ရက်"
              value={promotionDraft?.startsAt || ""}
              onChange={(event) =>
                setPromotionDraft((draft) => ({
                  ...draft,
                  startsAt: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              required
              type="date"
              label="ပြီးဆုံးရက်"
              value={promotionDraft?.endsAt || ""}
              onChange={(event) =>
                setPromotionDraft((draft) => ({
                  ...draft,
                  endsAt: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <TextField
            multiline
            minRows={2}
            label="မှတ်စု"
            value={promotionDraft?.note || ""}
            onChange={(event) =>
              setPromotionDraft((draft) => ({
                ...draft,
                note: event.target.value,
              }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromotionDraft(null)}>မလုပ်တော့ပါ</Button>
          <Button
            variant="contained"
            disabled={
              !promotionDraft?.name.trim() ||
              !promotionTargets().length ||
               Number(promotionDraft?.value) <= 0 ||
               Number(promotionDraft?.minimumQuantity) < 1 ||
              !promotionDraft?.startsAt ||
              !promotionDraft?.endsAt
            }
            onClick={savePromotion}
          >
            ပရိုမိုးရှင်းသတ်မှတ်မည်
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(promotionPeriodDraft)}
        onClose={() => setPromotionPeriodDraft(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ပရိုမိုးရှင်းကာလပြင်ဆင်မည်</DialogTitle>
        <DialogContent className="pricing-form">
          <Typography fontWeight={800}>{promotionPeriodDraft?.name}</Typography>
          <Box className="pricing-date-row">
            <TextField
              required
              type="date"
              label="စတင်ရက်"
              value={promotionPeriodDraft?.startsAt || ""}
              onChange={(event) =>
                setPromotionPeriodDraft((draft) => ({
                  ...draft,
                  startsAt: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              required
              type="date"
              label="ပြီးဆုံးရက်"
              value={promotionPeriodDraft?.endsAt || ""}
              onChange={(event) =>
                setPromotionPeriodDraft((draft) => ({
                  ...draft,
                  endsAt: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          {promotionPeriodDraft?.endsAt &&
          promotionPeriodDraft.endsAt < promotionPeriodDraft.startsAt ? (
            <Typography color="error" variant="body2">
              ပြီးဆုံးရက်သည် စတင်ရက်ထက်နောက်ကျရပါမည်။
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromotionPeriodDraft(null)}>
            မလုပ်တော့ပါ
          </Button>
          <Button
            variant="contained"
            disabled={
              !promotionPeriodDraft?.startsAt ||
              !promotionPeriodDraft?.endsAt ||
              promotionPeriodDraft.endsAt < promotionPeriodDraft.startsAt
            }
            onClick={savePromotionPeriod}
          >
            ကာလသိမ်းမည်
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(cancelPromotionDraft)}
        onClose={() => setCancelPromotionDraft(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ပရိုမိုးရှင်းဖျက်သိမ်းမည်</DialogTitle>
        <DialogContent className="pricing-form">
          <Typography fontWeight={800}>{cancelPromotionDraft?.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            ဖျက်သိမ်းပြီးလျှင် ယခုအချိန်မှစ၍ အရောင်းတွင်
            ဤပရိုမိုးရှင်းမသက်ရောက်တော့ပါ။
          </Typography>
          <TextField
            required
            autoFocus
            multiline
            minRows={2}
            label="ဖျက်သိမ်းရသည့်အကြောင်းပြချက်"
            value={cancelPromotionDraft?.reason || ""}
            onChange={(event) =>
              setCancelPromotionDraft((draft) => ({
                ...draft,
                reason: event.target.value,
              }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelPromotionDraft(null)}>
            မလုပ်တော့ပါ
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={!cancelPromotionDraft?.reason.trim()}
            onClick={cancelPromotion}
          >
            ဖျက်သိမ်းမည်
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function RecordFilters({
  query,
  setQuery,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
}) {
  return (
    <Box className="pricing-filters">
      <TextField
        className="pricing-search"
        size="small"
        label="ကုန်ပစ္စည်း၊ ကုဒ် သို့မဟုတ် အမျိုးအစားဖြင့်ရှာရန်"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        slotProps={{
          input: { startAdornment: <SearchRoundedIcon fontSize="small" /> },
        }}
      />
      <Box className="pricing-date-row">
        <TextField
          size="small"
          type="date"
          label="မှ"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          type="date"
          label="အထိ"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Box>
    </Box>
  );
}
function ActivePromotionCard({ promotion, onEditPeriod, onCancel }) {
  return (
    <Box className="pricing-active-card">
      <Box className="pricing-active-main">
        <Box>
          <Typography fontWeight={850}>{promotion.promotionName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {promotion.scope} · ကုန်ပစ္စည်း {promotion.products.length} မျိုး
          </Typography>
        </Box>
        <Chip size="small" color="success" label="အသက်ဝင်နေသည်" />
      </Box>
      <Box className="pricing-active-details">
        <Chip
          size="small"
          color="warning"
          label={
            promotion.type === "percent"
              ? `${promotion.value}% လျှော့စျေး`
              : `${money(promotion.value)} ပရိုမိုးရှင်းစျေး`
          }
        />
        <Typography variant="body2">
          ကာလ — {promotion.startsAt} မှ {promotion.endsAt}
        </Typography>
      </Box>
      {promotion.note ? (
        <Typography variant="body2" color="text.secondary">
          မှတ်စု — {promotion.note}
        </Typography>
      ) : null}
      <Box className="pricing-active-actions">
        <Button
          size="small"
          variant="outlined"
          startIcon={<EditCalendarRoundedIcon />}
          onClick={onEditPeriod}
        >
          ကာလပြင်မည်
        </Button>
        <Button
          size="small"
          color="error"
          variant="outlined"
          startIcon={<CancelOutlinedIcon />}
          onClick={onCancel}
        >
          ဖျက်သိမ်းမည်
        </Button>
      </Box>
    </Box>
  );
}
function PriceRecord({ record }) {
  return (
    <Box className="pricing-record-card">
      <Box>
        <Typography fontWeight={850}>{record.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {record.sku} · {record.category} · {record.scope}
        </Typography>
      </Box>
      <Box className="pricing-record-values">
        <Typography>
          <s>{money(record.oldPrice)}</s> → <b>{money(record.newPrice)}</b>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {record.reason}
        </Typography>
        <Typography variant="caption">{record.changedAt}</Typography>
      </Box>
    </Box>
  );
}
function PromotionRecord({ record }) {
  const latestHistory = record.history?.at(-1);
  return (
    <Box className="pricing-record-card">
      <Box>
        <Typography fontWeight={850}>{record.promotionName}</Typography>
        <Typography variant="body2" color="text.secondary">
          {record.name} · {record.sku} · {record.scope}
        </Typography>
      </Box>
      <Box className="pricing-record-values">
        <Box className="pricing-record-chip-row">
          <Chip
            size="small"
            color={record.status === "cancelled" ? "error" : "success"}
            label={
              record.status === "cancelled"
                ? "ဖျက်သိမ်းထားသည်"
                : "အသက်ဝင်/သတ်မှတ်ထားသည်"
            }
          />
          <Chip
            size="small"
            color="warning"
            label={
              record.type === "percent"
                ? `${record.value}% လျှော့စျေး`
                : `${money(record.value)} ပရိုမိုးရှင်းစျေး`
            }
          />
        </Box>
        <Typography variant="body2">
          ကာလ — {record.startsAt} မှ {record.endsAt}
        </Typography>
        {record.status === "cancelled" ? (
          <Typography variant="body2" color="error">
            အကြောင်းပြချက် — {record.cancelReason}
          </Typography>
        ) : null}
        {latestHistory ? (
          <Typography variant="caption">
            {latestHistory.type} — {latestHistory.at}
          </Typography>
        ) : (
          <Typography variant="caption">{record.changedAt}</Typography>
        )}
      </Box>
    </Box>
  );
}
