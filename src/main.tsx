import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Copy, GripVertical, ChevronDown, Plus, X, Sun, Moon, Download, Check } from 'lucide-react'
import './styles.css'

type Currency = { code: string; name: string; country: string }
const currencies: Currency[] = [
  { code: 'USD', name: 'US Dollar', country: 'us' }, { code: 'GHS', name: 'Ghanaian Cedi', country: 'gh' },
  { code: 'KZT', name: 'Kazakhstani Tenge', country: 'kz' }, { code: 'GBP', name: 'British Pound', country: 'gb' },
  { code: 'NGN', name: 'Nigerian Naira', country: 'ng' },
  { code: 'EUR', name: 'Euro', country: 'eu' }, { code: 'JPY', name: 'Japanese Yen', country: 'jp' },
  { code: 'CAD', name: 'Canadian Dollar', country: 'ca' }, { code: 'AUD', name: 'Australian Dollar', country: 'au' }
]
const fallback: Record<string, number> = { USD: 1, GHS: 11.4, KZT: 453.99, GBP: .74, NGN: 1600, EUR: .92, JPY: 149.6, CAD: 1.36, AUD: 1.52 }
const today = () => new Date().toISOString().slice(0, 10)

function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('cc-theme') !== 'light')
  const [amount, setAmount] = useState(() => Number(localStorage.getItem('cc-amount') || 1))
  const [precision, setPrecision] = useState<'auto' | 0 | 2 | 4>(() => (localStorage.getItem('cc-precision') || 'auto') as 'auto' | 0 | 2 | 4)
  const [codes, setCodes] = useState<string[]>(() => JSON.parse(localStorage.getItem('cc-currencies') || '["USD","GHS","KZT","GBP"]'))
  const [base, setBase] = useState(() => localStorage.getItem('cc-base') || 'USD')
  const [rates, setRates] = useState<Record<string, number>>(fallback)
  const [status, setStatus] = useState('Cached rates')
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [editing, setEditing] = useState<{ code: string; value: string } | null>(null)

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('cc-theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { localStorage.setItem('cc-amount', String(amount)); localStorage.setItem('cc-precision', String(precision)); localStorage.setItem('cc-currencies', JSON.stringify(codes)); localStorage.setItem('cc-base', base) }, [amount, precision, codes, base])
  useEffect(() => { const fn = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent) }; window.addEventListener('beforeinstallprompt', fn); return () => window.removeEventListener('beforeinstallprompt', fn) }, [])
  useEffect(() => { if (!('serviceWorker' in navigator)) return; navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined) }, [])
  useEffect(() => {
    const key = 'cc-rates-' + base, stored = localStorage.getItem(key)
    if (stored) { const cache = JSON.parse(stored); setRates(cache.rates); setStatus(cache.date === today() ? 'Updated today' : 'Cached rates') }
    if (stored && JSON.parse(stored).date === today()) return
    fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}.json`)
      .then(r => r.ok ? r.json() : Promise.reject()).then(data => { const next = data[base.toLowerCase()] as Record<string, number>; setRates(next); localStorage.setItem(key, JSON.stringify({ date: today(), rates: next })); setStatus('Updated today') }).catch(() => setStatus(stored ? 'Cached rates' : 'Offline estimate'))
  }, [base])
  const baseRate = rates[base] || 1
  const value = (code: string) => amount * ((rates[code] || fallback[code] || 1) / baseRate)
  const formatAmount = (number: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: precision === 'auto' ? 4 : precision, minimumFractionDigits: precision === 'auto' ? 0 : precision }).format(number)
  const commaInput = (raw: string) => {
    const clean = raw.replaceAll(',', '').replace(/[^0-9.-]/g, '')
    const [whole = '', ...decimal] = clean.split('.')
    const signedWhole = whole.startsWith('-') ? '-' + whole.slice(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return decimal.length ? `${signedWhole}.${decimal.join('')}` : signedWhole
  }
  const currency = (code: string) => currencies.find(c => c.code === code) || currencies[0]
  const selectCode = (index: number) => { const next = window.prompt('Enter a currency code: USD, GHS, KZT, GBP, NGN, EUR, JPY, CAD, or AUD'); if (!next) return; const code = next.toUpperCase(); if (!currencies.some(c => c.code === code)) return alert('That currency is not available in this demo.'); const list = [...codes]; list[index] = code; setCodes(list); if (index === 0) setBase(code) }
  const addCurrency = (code: string) => { if (!codes.includes(code)) setCodes([...codes, code]); setPickerOpen(false) }
  const install = async () => { if (!installPrompt) return; await installPrompt.prompt(); setInstallPrompt(null) }
  const copy = async (code: string) => { await navigator.clipboard?.writeText(String(value(code))); setCopied(code); setTimeout(() => setCopied(null), 1200) }
  const changeValue = (code: string, raw: string) => { const formatted = commaInput(raw); setEditing({ code, value: formatted }); const next = Number(formatted.replaceAll(',', '')); if (!Number.isFinite(next)) return; const rate = (rates[code] || fallback[code] || 1) / baseRate; setAmount(next / rate) }
  const reset = () => setAmount(0)
  const moveCurrency = (target: number) => { if (dragIndex === null || dragIndex === target) return; const next = [...codes]; const [moved] = next.splice(dragIndex, 1); next.splice(target, 0, moved); setCodes(next); setDragIndex(null) }
  const rows = useMemo(() => codes.map(currency), [codes])
  return <main className="page"><section className="converter">
    <header><h1>Currency Converter</h1><div className="header-actions"><button className="theme" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun /> : <Moon />}</button>{installPrompt && <button className="install" onClick={install}><Download /> Install</button>}<div className="precision">{(['auto', 0, 2, 4] as const).map(p => <button key={String(p)} className={precision === p ? 'active' : ''} onClick={() => setPrecision(p)}>{p === 'auto' ? 'Auto' : `.${'0'.repeat(p)}`}</button>)}</div><button className="add" onClick={() => setPickerOpen(true)}><Plus /> Add</button></div></header>
    <div className="reset-bar"><button className="clear" onClick={reset} aria-label="Reset all amounts">C</button></div>
    <div className="rows">{rows.map((item, index) => <article className={'currency-row ' + (item.code === base ? 'base' : '')} key={item.code} draggable onDragStart={() => setDragIndex(index)} onDragOver={e => e.preventDefault()} onDrop={() => moveCurrency(index)} onDragEnd={() => setDragIndex(null)}>
      <GripVertical className="grip" /><button className="currency-select" onClick={() => selectCode(index)}><img src={`https://flagcdn.com/w80/${item.country}.png`} alt="" /><span><strong>{item.code}</strong><small>{item.name}</small></span><ChevronDown /></button>
      <input aria-label={`${item.code} amount`} type="text" inputMode="decimal" value={editing?.code === item.code ? editing.value : formatAmount(value(item.code))} onFocus={() => setEditing({ code: item.code, value: formatAmount(value(item.code)) })} onChange={e => changeValue(item.code, e.target.value)} onBlur={() => setEditing(null)} />
      <button className="copy" onClick={() => copy(item.code)} aria-label={`Copy ${item.code} value`}>{copied === item.code ? <Check /> : <Copy />}</button>{item.code !== base && <button className="remove" onClick={() => setCodes(codes.filter(code => code !== item.code))} aria-label={`Remove ${item.code}`}><X /></button>}
    </article>)}</div>
    <footer><span>Mid-market rates · For reference only</span><span className="updated"><i /> {status}</span></footer>
  </section>{pickerOpen && <div className="picker-backdrop" onMouseDown={() => setPickerOpen(false)}><section className="picker" onMouseDown={e => e.stopPropagation()}><div><h2>Add currency</h2><button aria-label="Close" onClick={() => setPickerOpen(false)}><X /></button></div><p>Choose a currency to add to your converter.</p><div className="currency-options">{currencies.filter(item => !codes.includes(item.code)).map(item => <button key={item.code} onClick={() => addCurrency(item.code)}><img src={`https://flagcdn.com/w40/${item.country}.png`} alt="" /><span><strong>{item.code}</strong><small>{item.name}</small></span><Plus /></button>)}</div></section></div>}<p className="privacy">Preferences and rates are stored locally on this device. Live rates use Currency API; flags use FlagCDN.</p></main>
}
interface BeforeInstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
createRoot(document.getElementById('root')!).render(<App />)
