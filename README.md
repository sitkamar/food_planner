# Specifikace projektu: Domácí plánovač jídla (Food Planner)

## 1. Úvod a cíl projektu
Cílem projektu je vývoj lehké, spolehlivé webové aplikace určené pro plánování stravování a evidenci zásob domácnosti. 
Aplikace poběží nepřetržitě na lokálním zařízení **Raspberry Pi** a bude optimalizována pro každodenní použití z mobilních telefonů i počítačů členů domácnosti.

Hlavní motivací je zjednodušit vymýšlení jídelníčku na týden, omezit plýtvání potravinami a mít stálý přehled o stavu mrazáku.

---

## 2. Klíčové funkční požadavky

### 2.1 Rejstřík jídel (Katalog / Databáze)
- Spravovatelný a editovatelný seznam oblíbených jídel (možnost přidávat, upravovat, mazat, kategorizovat).
- Každé jídlo bude mít jednoznačně rozlišující datové pole: název, nadkategorii, kategorii a případně podkategorii.
- V katalogu se nebudou používat tagy. Jídlo je identifikováno pomocí kombinace:
  - typ jídla: "Snídaně", "Hlavní jídlo", "Příloha", "Snack", "Nevaření" (v samostatné tabulce `food_types`)
  - nadkategorie: detailní skupina v katalogu, např. "Snídaně - slané", "Eating out", "Snacky", "Saláty" nebo "Rýže"
  - kategorie: např. "s rýží", "s bramborami", "zeleninové", "sladké"
  - podkategorie: volitelně pro specializované sekce, zejména "Eating out" (např. "big back", "skinny queen")
- V CSV souboru se některé názvy jídla opakují, proto není název dostatečně jedinečný. V aplikaci se bude používat interní unikátní `food_id` nebo kombinace `(typ jídla, nadkategorie, kategorie, podkategorie, název)` jako přirozený identifikátor.
- V rozhraní se bude levá navigace přepínat mezi přehledem týdne a seznamem jídel; v pravém panelu zůstane jen formulář pro přidání nového jídla. Když uživatel otevře sekci "Jídla", zobrazí se seznam všech jídel s vyhledáváním a možností přidat jídlo.

### 2.1.1 Rozdělení dle typu jídla a slotů týdne
- Typ jídla je uložen v tabulce `food_types` a každá `food_supercategory` odkazuje na svůj `food_type_id`.
- Sloty týdne budou rozděleny tak, aby do dané sekce mohly vstoupit jen jídla s odpovídajícím typem:
  - snídaně → jen snídaně
  - hlavní jídlo → jen hlavní jídla
  - příloha → jen přílohy
  - snack → jen svačiny
  - nevaření → jen nevařící varianty
- Tato pravidla se budou uplatňovat jak v selektech v týdnu, tak při přidávání nových jídel do katalogu a při filtrování zobrazení.

#### 2.1.1 Struktura dat pro jídlo
- `id` – interní unikátní identifikátor
- `name` – název jídla
- `supercategory` – nadkategorie (hlavní jídlo, svačina, snídaně, nevaření)
- `category` – kategorie podle typu jídla (rýže, brambory, vejce, pečivo, sladké apod.)
- `subcategory` – nepovinné, používá se u sekce "Eating out" nebo dalších specializovaných skupin
- `is_active` – zda je jídlo aktivní v katalogu
- `notes` – volitelný poznámkový text (pokud bude potřeba)

#### 2.1.2 Příklad struktury CSV
- `Nadkategorie;Kategorie;Podkategorie;Název`
- `Snídaně - slané;vejce;;benedikt s holandskou`
- `Eating out;Mr fancy pants;big back;Pizza hut`
- `Snacky;cookies;;cookie and cream`

Tento formát ukazuje, že jídlo stejného názvu může existovat vícekrát v různých kategoriích, a proto musí být databáze navržena tak, aby rozlišovala položky podle jejich klasifikace, ne pouze podle názvu.

### 2.2 Týdenní plánovač
- Zobrazení týdenního cyklu (s možností procházet minulé a budoucí týdny).
- Plán na každý týden se skládá z pevných slotů:
  - **2 hlavní vařená jídla** (výběr z katalogu jídel, počítá se s vařením na více dní).
  - **Snídaně** na daný týden (např. předvolené rotující možnosti nebo volný text/výběr).
  - **Svačiny** na daný týden.
  - **1 nevařící slot** (např. návštěva restaurace, kavárny, objednávka jídla/dovoz).
- Možnost snadného přetažení nebo kliknutí pro naplánování jídel do týdne.

### 2.3 Správa mrazáku a zbytků
- **Přesun nedojedeného jídla:** Pokud na konci týdne (nebo v jeho průběhu) zbydou porce uvařeného jídla, lze je jedním kliknutím převést z plánovače do mrazáku (automaticky se vytvoří záznam s názvem jídla a aktuálním datem zamrazení).
- **Konzumace z mrazáku:** Jakmile se hotové zamrazené jídlo spotřebuje, jedním klikem se z mrazáku odepíše.
- **Evidence trvanlivých surovin:**
  - Samostatná sekce pro suroviny (maso, ryby, mražená zelenina, pečivo, vývary apod.).
  - U každé položky se sleduje název, datum vložení, kategorie a množství (např. počet kusů, gramáž, počet balení).
  - Možnost rychlé změny množství (+/-).

### 2.4 Zabezpečení a správa přístupu
- Aplikace **nesmí být otevřená veřejnosti**.
- Přístup chráněný heslem / PIN kódem.
- **Perzistentní přihlášení (Remember Me):** Po prvním přihlášení si zařízení (mobil, tablet, notebook) uchová autorizaci (pomocí dlouhodobého tokenu/cookie), takže není nutné se při každé návštěvě znovu přihlašovat.

---

## 3. Návrh technického řešení

### 3.1 Hardwarové a systémové prostředí
- **Hardware:** Raspberry Pi (např. RPi 3B+, 4 nebo Zero 2W).
- **Provoz:** Kontejnerizace přes **Docker & Docker Compose** pro snadné nasazení, aktualizace a zálohování.

### 3.2 Doporučený technologický stack
- **Backend:** 
  - *Varianta A (doporučeno):* **Python (FastAPI)** – rychlý, nenáročný na paměť, automatická validace dat, skvělá dokumentace.
  - *Varianta B:* **Node.js (Express / Fastify / NestJS)**.
- **Databáze:** **SQLite** – ideální pro Raspberry Pi, žádná režie samostatného databázového serveru, data v jednom souboru pro jednoduché zálohování.
- **Frontend:**
  - Responzivní jednostránková aplikace (PWA / SPA) postavená např. na **Vue.js** / **Svelte** (lehké a rychlé) s **Tailwind CSS** pro moderní čistý design přizpůsobený mobilům.
- **Síť a dostupnost:**
  - Lokální síť: přístup přes lokální IP nebo mDNS název (např. `http://foodplanner.local`).
  - Vzdálený přístup (volitelně bezpečně): **Tailscale** (VPN bez nutnosti veřejné IP) nebo **Cloudflare Tunnel** s dodatečnou autorizací.

---

## 4. Pravidla a pokyny pro asistenta (AI Guidelines)

1. **Jazyk komunikace:** Veškerá komunikace, dokumentace, komentáře v kódu i uživatelské rozhraní musí být **výhradně v češtině**.
2. **Aktivní dovyjasňování:** Pokud při řešení jakéhokoliv úkolu, návrhu architektury nebo implementaci vzniknou nejasnosti či více možných cest, **AI se vždy nejdříve zeptá na doplňující informace**, než učiní zásadní předpoklad.
3. **Přírůstkový vývoj:** Postupovat krok za krokem – od specifikace datového modelu, přes backendové API, až po frontend a nasazení na Raspberry Pi.

---

## 5. Otevřené otázky k upřesnění projektu

Pro finální doladění architektury a funkcí prosím odpovězte na následující otázky:

1. **Uživatelské účty:**
   - Má mít každý člen domácnosti vlastní účet (přihlašovací jméno a heslo), nebo stačí jedno společné „domácí“ heslo pro celou rodinu?
   * Ne, stačí pouze jeden společný účet pro celou rodinu.
2. **Přístup mimo domov:**
   - Bude se plánovač používat pouze doma na domácí Wi-Fi, nebo chcete mít přístup k jídelníčku a mrazáku i z obchodu / z práce? (Pokud i mimo domov, preferujete řešení typu Tailscale VPN, nebo Cloudflare Tunnel?)
   * chtěl bych přístup odkudkoliv a výsledek na mé stránce www.martin-a-lea.cz/jidelnicek
3. **Nákupní seznam:**
   - Bude žádoucí v budoucnu generovat z naplánovaného týdne a stavu mrazáku automatický nákupní seznam?
   * Jako budoucí možnost ano, ale zatím stačí pouze plánování jídel.
4. **Detail receptů:**
   - Stačí u jídel v databázi pouze jejich název a tagy, nebo plánujete ukládat i celý postup vaření, seznam surovin a fotky?
   * Zatím pouze název s tagy. Až se bude vytvářet rozšíření případné generování automatického nákupního seznamu, přidají se seznamy surovin.
5. **Konkrétní model Raspberry Pi:**
   - Na jakém konkrétním modelu Raspberry Pi a jakém operačním systému (např. Raspberry Pi OS 64-bit Lite) bude aplikace provozována?
   * Jedná se raspberry Pi 4 model B (2GB) s Debianem.