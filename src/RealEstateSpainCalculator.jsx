// Calculadora Inmobiliaria (versión 1.7)
// Cambios clave:
// - Eliminado todo el código de exportación a PDF.
// - Inputs numéricos: al teclear "." se convierte en "," automáticamente (formato es-ES) y NO se insertan separadores de miles.
// - IBI, comunidad, seguro hogar, seguro de vida y de impago: valores por defecto calculados a partir del alquiler mensual (editables y no se sobreescriben si el usuario los cambia).
// - Al cerrar el popup de análisis, la información calculada permanece visible.
// - Añadido disclaimer educativo (no asesoramiento).
// - Botón "ANÁLISIS DE LA OPERACIÓN" con degradado, texto oscuro en MAYÚSCULAS y halo animado.
// - Gráficos y tabla solo se muestran tras pulsar el botón de análisis.
// - Corregido error de import duplicado de Tooltip.
// - Corregido JSX (todos los <tr> cerrados) y bloque de tests en try/catch.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { CardContent } from "./components/ui/card";
import { RoundedCard } from "./components/ui/rounded-card";
import { Button } from "./components/ui/button";
import { Switch } from "./components/ui/switch";
import { RoundedInput } from "./components/ui/rounded-input";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { PillBadge } from "./components/ui/pill-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { ResponsiveContainer, Legend, Area, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import { Info, Lock, TrendingUp, X as Close } from "lucide-react";

// ------------- Utilidades -------------
/** Convierte un string con formato español a número JS.
 *  Reglas: quita espacios, elimina puntos (miles) y usa "," como decimal.
 *  Ej: "1.234.567,89" -> 1234567.89
 */
const toNumberES = (raw) => {
  if (raw === null || raw === undefined) return NaN;
  const s = String(raw)
    .trim()
    .replace(/\s+/g, "") // quitar espacios
    .replace(/\./g, "")  // quitar separadores de miles
    .replace(/,/g, ".");  // coma -> punto
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
};
// Mostrar números sin separadores de miles en inputs; para textos externos podemos usar toLocale si se desea.
const formatForInput = (n) => (Number.isFinite(n) ? String(n).replace(".", ",") : "");
const currency = (n) => (isNaN(n) ? "" : n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }));
const pct = (n) => (isNaN(n) ? "–" : `${n.toFixed(2)}%`);
const safe = (n) => (isNaN(n) ? 0 : n);
const isNum = (n) => Number.isFinite(n) && !isNaN(n);

function NumberField({ id, value, onNumberChange, placeholder, className, inputRef, error, disabled, onUserEdit }) {
  const [text, setText] = useState(formatForInput(value));
  useEffect(() => {
    setText(formatForInput(value));
  }, [value]);
  return (
    <RoundedInput
      id={id}
      aria-invalid={!!error}
      ref={inputRef}
      inputMode="decimal"
      placeholder={placeholder}
      className={`${className || ""} ${error ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
      value={text}
      onChange={(e) => {
        // Forzamos "." -> "," (decimal es-ES) y NO aplicamos miles.
        const raw = e.target.value.replace(/\./g, ",");
        setText(raw);
        onNumberChange(toNumberES(raw));
        onUserEdit?.();
      }}
      onBlur={() => {
        const n = toNumberES(text);
        setText(Number.isFinite(n) ? String(n).replace(".", ",") : "");
      }}
      disabled={disabled}
    />
  );
}

// Tests rápidos en runtime (no rompen la app si fallan)
try {
  console.assert(typeof currency === "function", "currency definida");
  console.assert(toNumberES("250000") === 250000, "toNumberES entero");
  console.assert(toNumberES("250.000") === 250000, "toNumberES miles simples");
  console.assert(toNumberES("1.234.567,89") === 1234567.89, "toNumberES multi-miles y decimales");
  console.assert(toNumberES("3,2") === 3.2, "toNumberES coma decimal");
  // Test IRR sencillo: -100 hoy, +110 en 1 año -> ~10%
  (function(){
    function _irr(cashflows, guess = 0.05){
      let rate = guess;
      for (let i = 0; i < 40; i++) {
        const f = cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
        const df = cashflows.reduce((acc, cf, t) => acc - (t * cf) / Math.pow(1 + rate, t + 1), 0);
        const newRate = rate - f / df;
        if (!isFinite(newRate)) break;
        if (Math.abs(newRate - rate) < 1e-7) { rate = newRate; break; }
        rate = Math.max(-0.99, newRate);
      }
      return rate;
    }
    const r = _irr([-100, 110]);
    console.assert(Math.abs(r - 0.1) < 1e-3, "IRR ~ 10% en caso simple");
  })();
} catch (e) { /* noop */ }

// ------------- Datos estáticos -------------
const COMMUNITIES = [
  "Andalucía","Aragón","Asturias","Baleares","Canarias","Cantabria","Castilla-La Mancha","Castilla y León","Cataluña","Comunidad Valenciana","Extremadura","Galicia","La Rioja","Comunidad de Madrid","Murcia","Navarra","País Vasco","Ceuta","Melilla"
];

const OFFICIAL_TAXES = {
  "Andalucía": { itp: 7.0, ajd: 1.2 },
  "Aragón": { itp: 8.0, ajd: 1.0 },
  "Asturias": { itp: 8.0, ajd: 1.2 },
  "Baleares": { itp: 8.0, ajd: 1.5 },
  "Canarias": { itp: 6.5, ajd: 1.0 },
  "Cantabria": { itp: 10.0, ajd: 1.5 },
  "Castilla-La Mancha": { itp: 9.0, ajd: 1.5 },
  "Castilla y León": { itp: 8.0, ajd: 1.5 },
  "Cataluña": { itp: 10.0, ajd: 1.5 },
  "Comunidad Valenciana": { itp: 10.0, ajd: 1.5 },
  "Extremadura": { itp: 8.0, ajd: 1.5 },
  "Galicia": { itp: 9.0, ajd: 1.5 },
  "La Rioja": { itp: 7.0, ajd: 1.0 },
  "Comunidad de Madrid": { itp: 6.0, ajd: 0.75 },
  "Murcia": { itp: 8.0, ajd: 1.5 },
  "Navarra": { itp: 6.0, ajd: 0.5 },
  "País Vasco": { itp: 4.0, ajd: 0.5 },
  "Ceuta": { itp: 6.0, ajd: 1.0 },
  "Melilla": { itp: 6.0, ajd: 1.0 },
};

const LOGO_URL = "/logo-ci.png";
const LOGO_FALLBACK_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>
<rect width='256' height='256' rx='32' fill='#0f172a'/>
<path d='M48 116v92a12 12 0 0 0 12 12h136a12 12 0 0 0 12-12v-92L128 36 48 116z' fill='#111827'/>
<path d='M80 144h24m-12-12v24M80 192h24m48 0h24M80 168h24M152 168h24M96 208h64' stroke='#e5e7eb' stroke-width='12' stroke-linecap='round'/>
<path d='M48 116 128 36l80 80' fill='none' stroke='#e5e7eb' stroke-width='12' stroke-linecap='round' stroke-linejoin='round'/>
</svg>`;

// ------------- Finanzas -------------
function estimateClosing(price) {
  const notary = Math.min(1500, Math.max(600, 400 + price * 0.0012));
  const registry = Math.min(900, Math.max(300, 200 + price * 0.0006));
  const gestoria = 350;
  return { notary: Math.round(notary), registry: Math.round(registry), gestoria };
}
function amortizationByYear({ loanAmount, monthlyRate, totalMonths, years }) {
  let balance = loanAmount;
  const mPay = monthlyRate===0? (loanAmount/totalMonths) : (loanAmount * (monthlyRate*Math.pow(1+monthlyRate,totalMonths)) / (Math.pow(1+monthlyRate,totalMonths)-1));
  const out = [];
  for (let y=1; y<=years; y++){
    let yi=0, yp=0;
    for(let m=1;m<=12;m++){
      if (balance<=0) break;
      const interest = balance*monthlyRate;
      const principal = Math.min(mPay - interest, balance);
      yi += interest; yp += principal; balance -= principal;
    }
    out.push({year:y, interest: yi, principal: yp, balance: Math.max(0,balance)});
    if (balance<=0) { for (let r=y+1; r<=years; r++) out.push({year:r, interest:0, principal:0, balance:0}); break; }
  }
  return out;
}
function marginalIRPF(annualNet){
  const base = Math.max(0, annualNet);
  if (base <= 12450) return 0.19;
  if (base <= 20200) return 0.24;
  if (base <= 35200) return 0.30;
  if (base <= 60000) return 0.37;
  if (base <= 300000) return 0.45;
  return 0.47;
}

// ------------- Componente -------------
export default function RealEstateSpainCalculator() {
  const analysisTimeoutRef = useRef(null);

  const refCommunity = useRef(null);
  const refPrice = useRef(null);
  const refDown = useRef(null);
  const refRate = useRef(null);
  const refYears = useRef(null);
  const refRent = useRef(null);
  const refProjYears = useRef(null);

  // Compra
  const [community, setCommunity] = useState("");
  const [useOfficial, setUseOfficial] = useState(true);
  const [newOrUsed, setNewOrUsed] = useState("segunda_mano");
  const [price, setPrice] = useState(NaN);
  const [downPct, setDownPct] = useState(NaN);
  const [mortgageRate, setMortgageRate] = useState(NaN);
  const [mortgageYears, setMortgageYears] = useState(NaN);
  const [reformCost, setReformCost] = useState(NaN);

  // Alquiler
  const [rent, setRent] = useState(NaN);
  const [rentGrowth, setRentGrowth] = useState(2);
  const [years, setYears] = useState(10);

  // Costes + flags de edición manual
  const [ibi, setIbi] = useState(NaN);
  const [comunidadGastos, setComunidadGastos] = useState(NaN);
  const [seguro, setSeguro] = useState(NaN);
  const [lifeInsurance, setLifeInsurance] = useState(NaN);
  const [unpaidInsurance, setUnpaidInsurance] = useState(NaN);
  const [miscExpenses, setMiscExpenses] = useState(NaN);
  const [mantenimientoPct, setMantenimientoPct] = useState(5);
  const [ibiTouched, setIbiTouched] = useState(false);
  const [comuTouched, setComuTouched] = useState(false);
  const [seguroTouched, setSeguroTouched] = useState(false);
  const [vidaTouched, setVidaTouched] = useState(false);
  const [impagoTouched, setImpagoTouched] = useState(false);

  // Impuestos compra
  const [itpUser, setItpUser] = useState(7);
  const [ajdUser, setAjdUser] = useState(1);

  // Cierre
  const [autoClosing, setAutoClosing] = useState(true);
  const autoEst = estimateClosing(safe(price));
  const estimateAppraisal = (p)=> Math.round(Math.max(250, Math.min(600, 200 + p*0.001)));
  const [appraisal, setAppraisal] = useState(estimateAppraisal(safe(price)));
  const [notary, setNotary] = useState(autoEst.notary);
  const [registry, setRegistry] = useState(autoEst.registry);
  const [gestoria, setGestoria] = useState(autoEst.gestoria);
  const [agencyCommission, setAgencyCommission] = useState(NaN);
  const [otherClosing, setOtherClosing] = useState(NaN);

  // UI
  const [calcPurchase, setCalcPurchase] = useState(false);
  const [calcRent, setCalcRent] = useState(false);
  const [showAnalysisAsk, setShowAnalysisAsk] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [errPurchase, setErrPurchase] = useState("");
  const [errRent, setErrRent] = useState("");

  const official = OFFICIAL_TAXES[community] ?? { itp: 0, ajd: 0 };
  const itp = useOfficial ? official.itp : itpUser;
  const ajd = useOfficial ? official.ajd : ajdUser;

  // Hipoteca
  const loanAmount = useMemo(() => Math.max(0, safe(price) * (1 - safe(downPct) / 100)), [price, downPct]);
  const monthlyRate = useMemo(() => safe(mortgageRate) / 100 / 12, [mortgageRate]);
  const nMonths = useMemo(() => Math.max(1, Math.round(safe(mortgageYears) * 12) || 1), [mortgageYears]);
  const monthlyPayment = useMemo(() => {
    if (monthlyRate === 0) return loanAmount / nMonths;
    const q = Math.pow(1 + monthlyRate, nMonths);
    return loanAmount * (monthlyRate * q) / (q - 1);
  }, [loanAmount, monthlyRate, nMonths]);

  // Costes compra
  const itpCost = newOrUsed === "segunda_mano" ? (safe(price) * safe(itp)) / 100 : 0;
  const ivaCost = newOrUsed === "obra_nueva" ? safe(price) * 0.10 : 0;
  const ajdCost = newOrUsed === "obra_nueva" ? (safe(price) * safe(ajd)) / 100 : 0;
  const closingAuto = autoClosing ? (autoEst.notary + autoEst.registry + autoEst.gestoria) : (safe(notary) + safe(registry) + safe(gestoria));
  const closingCosts = safe(itpCost) + safe(ivaCost) + safe(ajdCost) + safe(closingAuto) + safe(appraisal) + safe(agencyCommission) + safe(otherClosing);
  const entryCash = safe(price) * (safe(downPct) / 100);
  const initialCashNeeded = entryCash + closingCosts; // sin reforma
  const cashInvested = initialCashNeeded + safe(reformCost); // con reforma

  // Proyección
  const amort = useMemo(()=> amortizationByYear({ loanAmount, monthlyRate, totalMonths: nMonths, years: Math.max(1, Math.round(safe(mortgageYears))) }), [loanAmount, monthlyRate, nMonths, mortgageYears]);
  const projection = useMemo(() => {
    const arr = [];
    let currentRent = safe(rent);
    const reduction = (safe(reformCost) > 0 ? 0.60 : 0.50);
    for (let y = 1; y <= safe(years); y++) {
      const annualIncome = currentRent * 12;
      const maintenance = (safe(mantenimientoPct) / 100) * annualIncome;
      const inflationFactor = Math.pow(1.02, y - 1);
      const fixed0 = safe(ibi) + safe(comunidadGastos) + safe(seguro) + safe(lifeInsurance) + safe(unpaidInsurance) + safe(miscExpenses);
      const fixed = fixed0 * inflationFactor;
      const annualMortgage = monthlyPayment * 12;
      const opex = maintenance + fixed;
      const expenses = opex + annualMortgage;
      const netBeforeTax = annualIncome - expenses;
      const interests = amort[y-1]?.interest || 0;
      const taxable = Math.max(0, annualIncome - (opex + interests));
      const reducedBase = taxable * (1 - reduction);
      const rate = marginalIRPF(reducedBase);
      const irpf = reducedBase * rate;
      arr.push({ year: y, rent: annualIncome, expenses, net: netBeforeTax - irpf, irpf, mortgage: annualMortgage });
      currentRent *= 1 + safe(rentGrowth) / 100;
    }
    return arr;
  }, [years, rent, mantenimientoPct, ibi, comunidadGastos, seguro, lifeInsurance, unpaidInsurance, miscExpenses, monthlyPayment, rentGrowth, reformCost, amort]);

  // Métricas
  const avgNetYield10Y = useMemo(() => {
    const nYears = Math.min(10, projection.length || 1);
    const avgNet10 = projection.slice(0, nYears).reduce((s, r) => s + r.net, 0) / nYears;
    return (avgNet10 / Math.max(1, cashInvested)) * 100;
  }, [projection, cashInvested]);

  function irr(cashflows, guess = 0.05) {
    let rate = guess;
    for (let i = 0; i < 40; i++) {
      const f = cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
      const df = cashflows.reduce((acc, cf, t) => acc - (t * cf) / Math.pow(1 + rate, t + 1), 0);
      const newRate = rate - f / df;
      if (!isFinite(newRate)) break;
      if (Math.abs(newRate - rate) < 1e-7) { rate = newRate; break; }
      rate = Math.max(-0.99, newRate);
    }
    return rate;
  }
  const irrAnnual = useMemo(() => {
    const flows = [-(cashInvested), ...projection.map(p => p.net)];
    const r = irr(flows, 0.06);
    return isFinite(r) ? r * 100 : NaN;
  }, [cashInvested, projection]);

  const totalInterestFull = useMemo(() => amort.reduce((s, r) => s + r.interest, 0), [amort]);
  const totalAcquisition = safe(price) + closingCosts + safe(reformCost);
  const totalCostOfHome = totalAcquisition + totalInterestFull;

  // Gráficos
  const chartData = useMemo(() => projection.map(p => ({ year: `Año ${p.year}`, Ingresos: Math.round(p.rent), Gastos: Math.round(p.expenses), Neto: Math.round(p.net) })), [projection]);
  const chartBreakdownDebt = useMemo(() => amort.map(p => ({ year: `Año ${p.year}`, Intereses: Math.round(p.interest), Principal: Math.round(p.principal) })), [amort]);

  // Recomendaciones
  const targetGrossYield = 0.065;
  const recommendedMaxPrice = useMemo(() => {
    const annualRent = safe(rent) * 12;
    if (annualRent <= 0) return NaN;
    return annualRent / targetGrossYield;
  }, [rent]);
  const recommendedRent = useMemo(() => {
    const annual = totalAcquisition * targetGrossYield;
    return annual / 12;
  }, [totalAcquisition]);

  const yieldY1 = useMemo(()=> {
    const y1 = projection[0];
    return y1 ? (y1.net / Math.max(1, cashInvested)) * 100 : NaN;
  }, [projection, cashInvested]);
  const grade = (() => {
    const y = yieldY1;
    if (isNaN(y)) return { label: "–", color: "text-neutral-500" };
    if (y >= 10) return { label: "Muy buena", color: "text-emerald-700" };
    if (y >= 7) return { label: "Buena", color: "text-emerald-600" };
    if (y >= 4) return { label: "Aceptable", color: "text-amber-600" };
    if (y >= 2) return { label: "Mala", color: "text-rose-600" };
    return { label: "Muy mala", color: "text-rose-700" };
  })();

  const gradientBg = "bg-[linear-gradient(90deg,rgba(255,186,120,0.35)_0%,rgba(255,255,255,0.5)_50%,rgba(203,213,255,0.35)_100%)]";

  // Estimar costes por renta (auto por defecto, editables)
  useEffect(() => {
    if (!isNum(rent)) return;
    const m = safe(rent);
    if (!ibiTouched) setIbi(Math.round(m * 0.6));
    if (!comuTouched) setComunidadGastos(Math.round(m * 0.5));
    if (!seguroTouched) setSeguro(Math.round(m * 0.25));
    if (!vidaTouched) setLifeInsurance(Math.round(m * 0.3));
    if (!impagoTouched) setUnpaidInsurance(Math.round(m * 0.5));
  }, [rent, ibiTouched, comuTouched, seguroTouched, vidaTouched, impagoTouched]);

  // Validaciones
  const scrollTo = (el)=> el?.scrollIntoView({ behavior: "smooth", block: "center" });
  const validatePurchase = () => {
    if (!community){ setErrPurchase("Faltan datos obligatorios en compra: comunidad"); scrollTo(refCommunity.current); return false; }
    if (!isNum(price)){ setErrPurchase("Faltan datos obligatorios en compra: precio" ); scrollTo(refPrice.current); return false; }
    if (!isNum(downPct)){ setErrPurchase("Faltan datos obligatorios en compra: entrada (%)" ); scrollTo(refDown.current); return false; }
    if (!isNum(mortgageRate)){ setErrPurchase("Faltan datos obligatorios en compra: tipo de interés" ); scrollTo(refRate.current); return false; }
    if (!isNum(mortgageYears)){ setErrPurchase("Faltan datos obligatorios en compra: años hipoteca" ); scrollTo(refYears.current); return false; }
    setErrPurchase(""); return true;
  };
  const validateRent = () => {
    if (!isNum(rent)){ setErrRent("Faltan datos obligatorios en alquiler: alquiler mensual" ); scrollTo(refRent.current); return false; }
    if (!isNum(years)){ setErrRent("Faltan datos obligatorios en alquiler: años de proyección" ); scrollTo(refProjYears.current); return false; }
    setErrRent(""); return true;
  };
  const onCalcPurchase = () => { if (!validatePurchase()) return; setCalcPurchase(true); };
  const onCalcRent = () => { if (!validateRent()) return; setCalcRent(true); };

  // Popup análisis
  const openAnalysis = () => {
    setShowAnalysisAsk(true);
    setAnalysisLoading(true);
    if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    analysisTimeoutRef.current = setTimeout(() => {
      setAnalysisLoading(false);
      setAnalysisDone(true); // Persistente tras cerrar
    }, 1000);
  };
  const closeAnalysis = () => {
    setShowAnalysisAsk(false);
    setAnalysisLoading(false);
    // No cambiamos analysisDone para que la info siga visible
  };
  useEffect(() => () => { if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current); }, []);

  return (
    <div className={`min-h-screen ${gradientBg} text-neutral-800 font-sans`}>
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img
              src={LOGO_URL}
              alt="Calculadora Inmobiliaria"
              className="h-10 w-10 rounded-lg bg-white shadow object-contain"
              onError={(e)=>{(e.currentTarget).src = 'data:image/svg+xml;utf8,' + encodeURIComponent(LOGO_FALLBACK_SVG);}}
            />
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Calculadora Inmobiliaria</h1>
              <p className="text-sm text-neutral-500">Analiza tus inversiones como un profesional</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <PillBadge className="py-1 px-3">versión 1.7</PillBadge>
          </div>
        </header>

        {/* Bloque 1: Compra */}
        <div className="space-y-4">
          <RoundedCard>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Compra del Inmueble</h3>
                <div className="flex items-center gap-2">
                  <Switch checked={useOfficial} onCheckedChange={setUseOfficial} id="official" />
                  <Label htmlFor="official" className="text-xs">Usar datos oficiales</Label>
                </div>
              </div>
              <Select value={community} onValueChange={setCommunity}>
                <SelectTrigger ref={refCommunity} className="rounded-xl border-emerald-500 focus:ring-emerald-500 focus:border-emerald-600 bg-white/90">
                  <SelectValue placeholder="Seleccionar comunidad autónoma" />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNITIES.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>

              
{/* Tipo de compra + info de impuestos */}
<div className="space-y-2">
  {/* Segmentado 2ª mano / Obra nueva */}
  <div className="inline-flex rounded-xl bg-neutral-100 p-1">
    <button
      type="button"
      onClick={() => setNewOrUsed('segunda_mano')}
      aria-pressed={newOrUsed === 'segunda_mano'}
      className={`px-3 py-1 rounded-lg text-sm transition
        ${newOrUsed==='segunda_mano'
          ? 'bg-white shadow font-medium text-neutral-900'
          : 'text-neutral-600 hover:bg-white/70'}`}
    >
      2ª mano
    </button>
    <button
      type="button"
      onClick={() => setNewOrUsed('obra_nueva')}
      aria-pressed={newOrUsed === 'obra_nueva'}
      className={`px-3 py-1 rounded-lg text-sm transition
        ${newOrUsed==='obra_nueva'
          ? 'bg-white shadow font-medium text-neutral-900'
          : 'text-neutral-600 hover:bg-white/70'}`}
    >
      Obra nueva
    </button>
  </div>

  {/* Línea de impuestos (debajo, sin superponerse) */}
  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
    {newOrUsed === 'segunda_mano' ? (
      <PillBadge>
        {`ITP ${pct(itp)}`}
      </PillBadge>
    ) : (
      <PillBadge>
        {`IVA 10% + AJD ${pct(ajd)}`}
      </PillBadge>
    )}
  </div>
</div>


              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs" htmlFor="price">Precio vivienda (€)</Label>
                  <NumberField id="price" value={price} onNumberChange={setPrice} placeholder="Ej.: 250000" inputRef={refPrice} error={!!errPurchase && !isNum(price)} />
                </div>
                <div>
                  <Label className="text-xs" htmlFor="downPct">Entrada (%)</Label>
                  <NumberField id="downPct" value={downPct} onNumberChange={setDownPct} placeholder="Ej.: 20" inputRef={refDown} error={!!errPurchase && !isNum(downPct)} />
                </div>
                <div>
                  <Label className="text-xs" htmlFor="rate">Tipo de interés (%)</Label>
                  <NumberField id="rate" value={mortgageRate} onNumberChange={setMortgageRate} placeholder="Ej.: 3,2" inputRef={refRate} error={!!errPurchase && !isNum(mortgageRate)} />
                </div>
                <div>
                  <Label className="text-xs" htmlFor="yearsMortgage">Años hipoteca</Label>
                  <NumberField id="yearsMortgage" value={mortgageYears} onNumberChange={setMortgageYears} placeholder="Ej.: 25" inputRef={refYears} error={!!errPurchase && !isNum(mortgageYears)} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs" htmlFor="reform">Gastos de reforma (€)</Label>
                  <NumberField id="reform" value={reformCost} onNumberChange={setReformCost} placeholder="Ej.: 15000" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <Label className="text-xs flex items-center gap-1" htmlFor="itp">ITP (%) {useOfficial && <Lock className="w-3 h-3"/>}</Label>
                  <NumberField id="itp" value={useOfficial? itp : itpUser} onNumberChange={setItpUser} placeholder="Ej.: 6" disabled={useOfficial} />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1" htmlFor="ajd">AJD (%) {useOfficial && <Lock className="w-3 h-3"/>}</Label>
                  <NumberField id="ajd" value={useOfficial? ajd : ajdUser} onNumberChange={setAjdUser} placeholder="Ej.: 1" disabled={useOfficial} />
                </div>
                <div>
                  <Label className="text-xs" htmlFor="otherClosing">Otros gastos (€)</Label>
                  <NumberField id="otherClosing" value={otherClosing} onNumberChange={setOtherClosing} placeholder="Ej.: 500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 flex items-center justify-between rounded-xl border p-2 bg-white/70">
                  <div className="text-xs">Cálculo Notaría/Registro/Gestoría</div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="autoClosing" className="text-xs">Automático por precio</Label>
                    <Switch id="autoClosing" checked={autoClosing} onCheckedChange={setAutoClosing} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs" htmlFor="notary">Notaría (€)</Label>
                  <NumberField id="notary" value={autoClosing? autoEst.notary : notary} onNumberChange={setNotary} disabled={autoClosing} />
                </div>
                <div>
                  <Label className="text-xs" htmlFor="registry">Registro (€)</Label>
                  <NumberField id="registry" value={autoClosing? autoEst.registry : registry} onNumberChange={setRegistry} disabled={autoClosing} />
                </div>
                <div>
                  <Label className="text-xs" htmlFor="gestoria">Gestoría (€)</Label>
                  <NumberField id="gestoria" value={autoClosing? autoEst.gestoria : gestoria} onNumberChange={setGestoria} disabled={autoClosing} />
                </div>
                <div>
                  <Label className="text-xs" htmlFor="appraisal">Tasación (€)</Label>
                  <NumberField id="appraisal" value={appraisal} onNumberChange={setAppraisal} placeholder={`Sugerido: ${String(Math.round(Math.max(250, Math.min(600, 200 + safe(price)*0.001))))}` } />
                  <div className="text-[11px] text-neutral-500 mt-1">Sugerido: {currency(Math.round(Math.max(250, Math.min(600, 200 + safe(price)*0.001))))}</div>
                </div>
                <div>
                  <Label className="text-xs" htmlFor="agency">Comisión de agencia (€)</Label>
                  <NumberField id="agency" value={agencyCommission} onNumberChange={setAgencyCommission} />
                </div>
              </div>

              <div className="grid grid-cols-1 pt-2 gap-2">
                {errPurchase && <div className="text-rose-600 text-sm">{errPurchase}</div>}
                <Button variant="primary" onClick={onCalcPurchase} className="rounded-xl w-full   !">Calcular</Button>
              </div>
            </CardContent>
          </RoundedCard>

          {calcPurchase && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-neutral-800 !text-neutral-800">
              <RoundedCard className="text-neutral-800 !text-neutral-800"><CardContent className="p-4 text-neutral-800 !text-neutral-800"><div className="text-xs text-neutral-500 mb-1 text-neutral-800 !text-neutral-800">Desembolso inicial (incl. reforma)</div><div className="text-2xl font-semibold text-neutral-800 !text-neutral-800">{currency(cashInvested)}</div><div className="text-[11px] text-neutral-500 mt-1 text-neutral-800 !text-neutral-800">Entrada: {currency(entryCash)} · Impuestos: {currency(itpCost + ivaCost + ajdCost)} · Gastos compraventa: {currency((autoClosing? (autoEst.notary+autoEst.registry+autoEst.gestoria) : (safe(notary)+safe(registry)+safe(gestoria))) + safe(appraisal) + safe(agencyCommission) + safe(otherClosing))} · Reforma: {currency(safe(reformCost))}</div></CardContent></RoundedCard>
              <RoundedCard className="text-neutral-800 !text-neutral-800"><CardContent className="p-4 text-neutral-800 !text-neutral-800"><div className="text-xs text-neutral-500 mb-1 text-neutral-800 !text-neutral-800">Cuota hipoteca (mensual)</div><div className="text-2xl font-semibold text-neutral-800 !text-neutral-800">{currency(monthlyPayment)}</div><div className="text-[11px] text-neutral-500 mt-1 text-neutral-800 !text-neutral-800">Principal + intereses</div></CardContent></RoundedCard>
              <RoundedCard className="text-neutral-800 !text-neutral-800"><CardContent className="p-4 text-neutral-800 !text-neutral-800"><div className="text-xs text-neutral-500 mb-1 text-neutral-800 !text-neutral-800">Coste total de la vivienda</div><div className="text-2xl font-semibold text-neutral-800 !text-neutral-800">{currency(totalCostOfHome)}</div><div className="text-[11px] text-neutral-500 mt-1 text-neutral-800 !text-neutral-800">Precio + adquisición + reforma + intereses</div></CardContent></RoundedCard>
            </div>
          )}
        </div>

        {/* Bloque 2: Alquiler y costes */}
        <div className="space-y-4 mt-6 text-neutral-800 !text-neutral-800">
          <RoundedCard className="text-neutral-800 !text-neutral-800">
            <CardContent className="p-4 space-y-3 text-neutral-800 !text-neutral-800">
              <div className="flex items-center justify-between text-neutral-800 !text-neutral-800">
                <h3 className="font-medium text-neutral-800 !text-neutral-800">Alquiler y costes</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-neutral-800 !text-neutral-800">
                <div>
                  <Label className="text-xs text-neutral-800 !text-neutral-800" htmlFor="rent">Alquiler mensual inicial (€)</Label>
                  <NumberField id="rent" value={rent} onNumberChange={setRent} placeholder="Ej.: 1200" className="text-neutral-800 !text-neutral-800" inputRef={refRent} error={!!errRent && !isNum(rent)} />
                </div>
                <div>
                  <Label className="text-xs text-neutral-800 !text-neutral-800" htmlFor="rentGrowth">Subida anual del alquiler (%)</Label>
                  <NumberField id="rentGrowth" value={rentGrowth} onNumberChange={setRentGrowth} placeholder="2" className="text-neutral-800 !text-neutral-800" />
                </div>
                <div>
                  <Label className="text-xs text-neutral-800 !text-neutral-800" htmlFor="projYears">Años de proyección</Label>
                  <NumberField id="projYears" value={years} onNumberChange={setYears} placeholder="10" className="text-neutral-800 !text-neutral-800" inputRef={refProjYears} error={!!errRent && !isNum(years)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-neutral-800 !text-neutral-800">
                <div>
                  <Label className="text-xs text-neutral-800 !text-neutral-800" htmlFor="ibi">IBI anual (€)</Label>
                  <NumberField id="ibi" value={ibi} onNumberChange={setIbi} className="text-neutral-800 !text-neutral-800" onUserEdit={()=>setIbiTouched(true)} />
                </div>
                <div>
                  <Label className="text-xs text-neutral-800 !text-neutral-800" htmlFor="comunidad">Comunidad (€)</Label>
                  <NumberField id="comunidad" value={comunidadGastos} onNumberChange={setComunidadGastos} className="text-neutral-800 !text-neutral-800" onUserEdit={()=>setComuTouched(true)} />
                </div>
                <div>
                  <Label className="text-xs text-neutral-800 !text-neutral-800" htmlFor="seguro">Seguro hogar (€)</Label>
                  <NumberField id="seguro" value={seguro} onNumberChange={setSeguro} className="text-neutral-800 !text-neutral-800" onUserEdit={()=>setSeguroTouched(true)} />
                </div>
                <div>
                  <Label className="text-xs text-neutral-800 !text-neutral-800" htmlFor="life">Seguro de vida (€/año)</Label>
                  <NumberField id="life" value={lifeInsurance} onNumberChange={setLifeInsurance} className="text-neutral-800 !text-neutral-800" onUserEdit={()=>setVidaTouched(true)} />
                </div>
                <div>
                  <Label className="text-xs text-neutral-800 !text-neutral-800" htmlFor="unpaid">Seguro de impago (€/año)</Label>
                  <NumberField id="unpaid" value={unpaidInsurance} onNumberChange={setUnpaidInsurance} className="text-neutral-800 !text-neutral-800" onUserEdit={()=>setImpagoTouched(true)} />
                </div>
                <div>
                  <Label className="text-xs text-neutral-800 !text-neutral-800" htmlFor="misc">Gastos varios (€/año)</Label>
                  <NumberField id="misc" value={miscExpenses} onNumberChange={setMiscExpenses} className="text-neutral-800 !text-neutral-800" />
                </div>
              </div>
              <div className="grid grid-cols-1 pt-2 gap-2 text-neutral-800 !text-neutral-800">
                {errRent && <div className="text-rose-600 text-sm text-neutral-800 !text-neutral-800">{errRent}</div>}
                <Button variant="primary" onClick={onCalcRent} className="rounded-xl w-full   !">Calcular</Button>
              </div>
            </CardContent>
          </RoundedCard>

          {calcRent && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-neutral-800 !text-neutral-800">
                <RoundedCard className="text-neutral-800 !text-neutral-800"><CardContent className="p-4 text-neutral-800 !text-neutral-800"><div className="text-xs text-neutral-500 mb-1 text-neutral-800 !text-neutral-800">Ingresos primer año</div><div className="text-2xl font-semibold text-neutral-800 !text-neutral-800">{currency(safe(rent)*12)}</div></CardContent></RoundedCard>
                <RoundedCard className="text-neutral-800 !text-neutral-800"><CardContent className="p-4 text-neutral-800 !text-neutral-800"><div className="text-xs text-neutral-500 mb-1 text-neutral-800 !text-neutral-800">Gastos primer año</div><div className="text-2xl font-semibold text-neutral-800 !text-neutral-800">{currency(projection[0]?.expenses || 0)}</div></CardContent></RoundedCard>
                <RoundedCard className="text-neutral-800 !text-neutral-800"><CardContent className="p-4 text-neutral-800 !text-neutral-800"><div className="text-xs text-neutral-500 mb-1 text-neutral-800 !text-neutral-800">Rentabilidad año 1</div><div className="text-2xl font-semibold text-neutral-800 !text-neutral-800">{pct(((projection[0]?.net || 0) / Math.max(1, cashInvested))*100)}</div></CardContent></RoundedCard>
                <RoundedCard className="text-neutral-800 !text-neutral-800"><CardContent className="p-4 text-neutral-800 !text-neutral-800"><div className="text-xs text-neutral-500 mb-1 text-neutral-800 !text-neutral-800">Rentabilidad media (10 años)</div><div className="text-2xl font-semibold text-neutral-800 !text-neutral-800">{pct(avgNetYield10Y)}</div></CardContent></RoundedCard>
              </div>

              <div className="pt-2 text-neutral-800 !text-neutral-800">
                {/* Botón con degradado y halo animado */}
                <div className="relative group text-neutral-800 !text-neutral-800">
                  <div className="absolute -inset-0.5 rounded-2xl bg-[linear-gradient(90deg,rgba(255,186,120,0.7)_0%,rgba(255,255,255,0.9)_50%,rgba(203,213,255,0.7)_100%)] blur-sm opacity-80 group-hover:opacity-100 transition-opacity duration-300 animate-pulse text-neutral-800 !text-neutral-800" aria-hidden />
                  <Button variant="gradient" onClick={openAnalysis} className="relative rounded-2xl w-full h-12 text-base bg-gradient-to-r from-amber-200 via-white to-indigo-200 hover:from-amber-300 hover:to-indigo-300 border border-white/70 shadow uppercase font-semibold tracking-wide">
                    ANÁLISIS DE LA OPERACIÓN
                  </Button>
                </div>
              </div>

              {analysisDone && (
                <>
                  <div className="space-y-3 pt-2 text-neutral-800 !text-neutral-800">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-neutral-800 !text-neutral-800">
                      <RoundedCard className="text-neutral-800 !text-neutral-800"><CardContent className="p-4 text-neutral-800 !text-neutral-800"><div className="text-xs text-neutral-500 mb-1 text-neutral-800 !text-neutral-800">Precio máximo compra + reforma recomendado</div><div className="text-2xl font-semibold text-neutral-800 !text-neutral-800">{currency(recommendedMaxPrice)}</div><div className="text-[11px] text-neutral-500 mt-1 text-neutral-800 !text-neutral-800">Objetivo de {Math.round(targetGrossYield*1000)/10}% bruto sobre renta actual</div></CardContent></RoundedCard>
                      <RoundedCard className="text-neutral-800 !text-neutral-800"><CardContent className="p-4 text-neutral-800 !text-neutral-800"><div className="text-xs text-neutral-500 mb-1 text-neutral-800 !text-neutral-800">Alquiler recomendado</div><div className="text-2xl font-semibold text-neutral-800 !text-neutral-800">{currency(recommendedRent)}</div><div className="text-[11px] text-neutral-500 mt-1 text-neutral-800 !text-neutral-800">Para alcanzar ~{Math.round(targetGrossYield*1000)/10}% bruto con el coste pagado</div></CardContent></RoundedCard>
                      <RoundedCard className="text-neutral-800 !text-neutral-800"><CardContent className="p-4 text-neutral-800 !text-neutral-800"><div className="text-xs text-neutral-500 mb-1 text-neutral-800 !text-neutral-800">Nota de la operación</div><div className={`text-2xl font-semibold ${grade.color}`}>{grade.label}</div><div className="text-[11px] text-neutral-500 mt-1 text-neutral-800 !text-neutral-800">Basada en la rentabilidad neta del año 1 ({pct(yieldY1)})</div></CardContent></RoundedCard>
                    </div>
                    <RoundedCard className="text-neutral-800 !text-neutral-800"><CardContent className="p-4 text-sm text-neutral-700 text-neutral-800 !text-neutral-800">
                      {isNaN(yieldY1) ? "Introduce datos para evaluar la operación." : (
                        grade.label === "Muy buena" ? "La operación presenta una rentabilidad neta sobresaliente en el primer año, con holgura para absorber variaciones de gastos o vacíos."
                        : grade.label === "Buena" ? "La operación es sólida: buen equilibrio entre desembolso y flujo neto. Puede mejorar negociando precio o ajustando el alquiler."
                        : grade.label === "Aceptable" ? "La operación cumple umbrales mínimos; conviene optimizar gastos o precio de compra para elevar la rentabilidad."
                        : grade.label === "Mala" ? "Rentabilidad ajustada: recomendable renegociar precio, revisar financiación o considerar mejoras de valor antes de ejecutar."
                        : "Rentabilidad insuficiente: alto riesgo de bajo retorno. Replantea precio objetivo o condiciones de alquiler/financiación."
                      )}
                    </CardContent></RoundedCard>
                  </div>

                  {/* Gráfico de flujos */}
                  <RoundedCard className="text-neutral-800 !text-neutral-800">
                    <CardContent className="p-4 text-neutral-800 !text-neutral-800">
                      <div className="flex items-center justify-between mb-3 text-neutral-800 !text-neutral-800">
                        <div>
                          <div className="text-sm font-medium flex items-center gap-2 text-neutral-800 !text-neutral-800"><TrendingUp className="w-4 h-4 text-neutral-800 !text-neutral-800"/> Proyección de flujos</div>
                          <div className="text-xs text-neutral-500 text-neutral-800 !text-neutral-800">Neto anual (post-IRPF) y componentes</div>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <PillBadge className="cursor-help text-neutral-800 !text-neutral-800">IRR {isNaN(irrAnnual)?"–":pct(irrAnnual)}</PillBadge>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs text-xs text-neutral-800 !text-neutral-800">
                              <p><strong>IRR</strong> (Tasa Interna de Retorno): estimación de la rentabilidad anual de la inversión teniendo en cuenta todos los flujos de caja. Incluye ingresos por alquiler, gastos e impuestos proyectados.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="h-64 text-neutral-800 !text-neutral-800">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={(v)=> (v/1000).toFixed(0)+"k"} />
                            <RechartsTooltip formatter={(v)=>currency(Number(v))} />
                            <Legend />
                            <Area type="monotone" dataKey="Ingresos" fill="#10B98122" stroke="#10B981" strokeWidth={2} />
                            <Area type="monotone" dataKey="Gastos" fill="#EF444422" stroke="#EF4444" strokeWidth={2} />
                            <Area type="monotone" dataKey="Neto" fill="#3B82F622" stroke="#3B82F6" strokeWidth={3} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </RoundedCard>

                  {/* Gráfico hipoteca */}
                  <RoundedCard className="text-neutral-800 !text-neutral-800">
                    <CardContent className="p-4 text-neutral-800 !text-neutral-800">
                      <div className="text-sm font-medium mb-2 text-neutral-800 !text-neutral-800">Intereses vs Principal (toda la hipoteca)</div>
                      <div className="h-56 text-neutral-800 !text-neutral-800">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartBreakdownDebt} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={(v)=> (v/1000).toFixed(0)+"k"} />
                            <RechartsTooltip formatter={(v)=>currency(Number(v))} />
                            <Legend />
                            <Area type="monotone" dataKey="Intereses" fill="#EF444422" stroke="#EF4444" strokeWidth={2} />
                            <Area type="monotone" dataKey="Principal" fill="#10B98122" stroke="#10B981" strokeWidth={2} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </RoundedCard>

                  {/* Tabla */}
                  <RoundedCard className="text-neutral-800 !text-neutral-800">
                    <CardContent className="p-4 text-neutral-800 !text-neutral-800">
                      <div className="text-sm font-medium mb-2 text-neutral-800 !text-neutral-800">Tabla de proyección</div>
                      <div className="overflow-auto rounded-xl border border-neutral-200 text-neutral-800 !text-neutral-800">
                        <table className="w-full text-sm text-neutral-800 !text-neutral-800">
                          <thead className="bg-neutral-50 text-neutral-800 !text-neutral-800">
                            <tr>
                              <th className="text-left p-2 text-neutral-800 !text-neutral-800">Año</th>
                              <th className="text-right p-2 text-neutral-800 !text-neutral-800">Ingresos</th>
                              <th className="text-right p-2 text-neutral-800 !text-neutral-800">Hipoteca</th>
                              <th className="text-right p-2 text-neutral-800 !text-neutral-800">IRPF</th>
                              <th className="text-right p-2 text-neutral-800 !text-neutral-800">Gastos totales</th>
                              <th className="text-right p-2 text-neutral-800 !text-neutral-800">Neto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projection.map((p) => (
                              <tr key={p.year} className="odd:bg-white even:bg-neutral-50 text-neutral-800 !text-neutral-800">
                                <td className="p-2 text-neutral-800 !text-neutral-800">{p.year}</td>
                                <td className="p-2 text-right text-neutral-800 !text-neutral-800">{currency(p.rent)}</td>
                                <td className="p-2 text-right text-neutral-800 !text-neutral-800">{currency(p.mortgage)}</td>
                                <td className="p-2 text-right text-neutral-800 !text-neutral-800">{currency(p.irpf)}</td>
                                <td className="p-2 text-right text-neutral-800 !text-neutral-800">{currency(p.expenses)}</td>
                                <td className={`p-2 text-right ${p.net>=0?"text-emerald-600":"text-rose-600"}`}>{currency(p.net)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </RoundedCard>
                </>
              )}
            </>
          )}

          <div className="flex items-center justify-between text-[12px] text-neutral-500 mt-6 text-neutral-800 !text-neutral-800">
            <div className="flex items-center gap-2 text-neutral-800 !text-neutral-800">
              <Info className="w-3.5 h-3.5 text-neutral-800 !text-neutral-800"/>
              <span>
                Este simulador es orientativo. Los tipos ITP/AJD marcados como <strong>oficiales</strong> deben validarse con fuentes actualizadas. La sección de IRPF no constituye asesoramiento fiscal.
              </span>
            </div>
          </div>

          {/* Disclaimer educativo */}
          <div className="text-[12px] text-neutral-500 mt-3 text-neutral-800 !text-neutral-800">
            <p>
              <strong>Exención de responsabilidad:</strong> Esta calculadora tiene fines exclusivamente educativos e informativos. No constituye asesoramiento financiero, fiscal o legal. Verifica siempre la normativa vigente y consulta con profesionales cualificados antes de tomar decisiones.
            </p>
          </div>
        </div>
      </div>

      {/* Popup Análisis */}
      {showAnalysisAsk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 text-neutral-800 !text-neutral-800">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl text-neutral-800 !text-neutral-800">
            <div className="flex items-center justify-between p-4 border-b text-neutral-800 !text-neutral-800">
              <h4 className="font-medium text-neutral-800 !text-neutral-800">Análisis de la operación</h4>
              <button className="p-1 rounded hover:bg-neutral-100 text-neutral-800 !text-neutral-800" onClick={closeAnalysis}><Close className="w-5 h-5 text-neutral-800 !text-neutral-800"/></button>
            </div>
            <div className="p-4 space-y-4 text-neutral-800 !text-neutral-800">
              {analysisLoading ? (
                <div className="py-10 text-center text-neutral-800 !text-neutral-800">
                  <div className="mx-auto mb-3 h-10 w-10 border-2 border-neutral-300 border-t-transparent rounded-full animate-spin text-neutral-800 !text-neutral-800" />
                  <div className="text-sm text-neutral-600 text-neutral-800 !text-neutral-800">Analizando cifras…</div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-neutral-800 !text-neutral-800">
                    <RoundedCard shadow={false} className="text-neutral-800 !text-neutral-800"><CardContent className="p-4 text-neutral-800 !text-neutral-800"><div className="text-xs text-neutral-500 mb-1 text-neutral-800 !text-neutral-800">Precio máximo compra + reforma recomendado</div><div className="text-xl font-semibold text-neutral-800 !text-neutral-800">{currency(recommendedMaxPrice)}</div></CardContent></RoundedCard>
                    <RoundedCard shadow={false} className="text-neutral-800 !text-neutral-800"><CardContent className="p-4 text-neutral-800 !text-neutral-800"><div className="text-xs text-neutral-500 mb-1 text-neutral-800 !text-neutral-800">Alquiler recomendado</div><div className="text-xl font-semibold text-neutral-800 !text-neutral-800">{currency(recommendedRent)}</div></CardContent></RoundedCard>
                    <RoundedCard shadow={false} className="text-neutral-800 !text-neutral-800"><CardContent className="p-4 text-neutral-800 !text-neutral-800"><div className="text-xs text-neutral-500 mb-1 text-neutral-800 !text-neutral-800">Nota de la operación</div><div className={`text-xl font-semibold ${grade.color}`}>{grade.label}</div></CardContent></RoundedCard>
                  </div>
                  <div className="text-sm text-neutral-700 text-neutral-800 !text-neutral-800">
                    {isNaN(yieldY1) ? "Introduce datos para evaluar la operación." : (
                      grade.label === "Muy buena" ? "Operación muy por encima de umbrales habituales de mercado: margen de seguridad alto."
                      : grade.label === "Buena" ? "Parámetros sólidos. Aun así, afina precio de compra o revisa gastos para elevar retorno."
                      : grade.label === "Aceptable" ? "Cumple mínimos, pero conviene optimizar condiciones antes de firmar."
                      : grade.label === "Mala" ? "Queda por debajo de los niveles deseables; renegocia o ajusta variables."
                      : "Muy por debajo de los estándares; se desaconseja salvo mejoras sustanciales."
                    )}
                  </div>
                </>
              )}
            </div>
            {!analysisLoading && (
              <div className="p-4 border-t flex justify-end gap-2 text-neutral-800 !text-neutral-800">
                <Button variant="secondary" onClick={closeAnalysis} className="text-neutral-800 !text-neutral-800">Cerrar</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
