# Rozhodnutí a změny projektu – Food Planner

Tento soubor je hlavním zdrojem pravdy o projektu. Všechny důležité rozhodnutí, změny, doplňky a návrhy se zapisují sem, aby se na ně později nemohlo zapomenout.

## 1. Základní pravidla
- Všechny důležité změny musí být zaznamenány zde.
- Rozhodnutí musí obsahovat důvod, kontext a datum.
- Pokud je navržena změna, musí být zaznamenána i s dopadem na projekt.
- Pokud není rozhodnutí zapsáno, považuje se za nejasné.

## 2. Rozhodnutí k projektu

### 2026-09-18 – Plánování po týdnech
- Rozhodnutí: Aplikace pracuje s plánem po týdnech, ne po jednotlivých dnech.
- Kontext: Klient upřesnil, že plánování se má dělat na celý týden, přičemž každý týden začíná pondělím a je identifikován datem prvního dne v týdnu.
- Důvod: Jedná se o praktický model pro rodinné plánování jídel, který je jednodušší a přehlednější.

### 2026-09-18 – Struktura týdne
- Rozhodnutí: Každý týden obsahuje 2 snídaně, 2 až 3 hlavní vařená jídla, 4 svačiny a 1 nevařící slot.
- Kontext: Jedná se o základní požadavek pro plánovací logiku aplikace.
- Důvod: Tím je zachována jednoduchost a přehled pro běžné vaření v domácnosti.

### 2026-09-19 – Dynamický počet slotů pro každý typ jídla
- Rozhodnutí: V týdenním plánu začíná každý typ jídla jedním slotem a uživatel může přidat další sloty pro snídani, vaření, svačinu i nevaření podle potřeby.
- Kontext: Klient požadoval, aby byl plán flexibilní a alespoň na začátku měl jen jednu položku v každé základní skupině, ale aby bylo možné přidat další varianty kdykoli během plánování.
- Důvod: Tím se zachová jednoduchý výchozí model, zároveň však dostane uživatel možnost přizpůsobit plán vlastním návykům, počtu členů domácnosti a délce týdne bez nutnosti upravovat pevně zakódovanou strukturu slotů.

### 2026-09-18 – Pravidlo začátku týdne
- Rozhodnutí: Týden začíná vždy pondělím a je rozlišován podle data prvního dne v týdnu.
- Kontext: Tím se zamezí zmatkům při přepínání mezi týdny a při plánování v delším období.
- Důvod: Průvodce projektu i uživatelské rozhraní mají pracovat s konzistentním modelem.

### 2026-09-18 – Jazyk projektu
- Rozhodnutí: Veškerá komunikace, dokumentace a uživatelské texty jsou výhradně v češtině.
- Kontext: Projekt je zaměřen na domácí použití a klient vyžaduje český jazyk v komunikaci a rozhraní.
- Důvod: Zachování jednotného projektu a snadnější používání pro domácnost.

### 2026-09-18 – Vytváření prototypu bez databáze
- Rozhodnutí: První prototyp je vytvořen bez databázové vrstvy, pouze pro ověření návrhu rozhraní a workflow.
- Kontext: Cílem je nejprve ověřit základní architekturu a UI procesu.
- Důvod: Rozhraní a logika plánování je předem potřeba ověřit, než se přidá backend a data.

### 2026-09-18 – Nahrazení tagů dvojvrstvým systémem kategorií
- Rozhodnutí: V katalogu jídel se nebudou používat tagy, ale dvouvrstvá klasifikace.
- Kontext: Klient upřesnil, že každé jídlo bude mít nadkategorii a kategorii. Nadkategorie určuje sekci jídla (hlavní jídlo, svačina, snídaně, nevaření), zatímco kategorie popisuje typ jídla (např. s rýží, s bramborami, zeleninové, sladké apod.).
- Důvod: Tím je zajištěna přehledná struktura pro filtrování a plánování podle typu jídla a souladu se sloty v týdnu.

### 2026-09-19 – CSV datový model a rozlišování duplicitních názvů jídel
- Rozhodnutí: Jídla budou ukládána s interním identifikátorem a klasifikací podle nadkategorie, kategorie a případně podkategorie.
- Kontext: CSV soubor obsahuje opakované názvy jídel, které se liší jen kategorií. Název samotný proto není dostatečně jedinečný.
- Důvod: Pro správné plánování, filtrování a import dat je nutné rozlišovat jídla podle taxonomie a ne jen podle názvu.

### 2026-09-19 – Připojení aplikace k Supabase jako zdroji dat
- Rozhodnutí: Aplikace bude číst katalog jídel a rozřazení přes Supabase PostgreSQL; Express server poskytuje API pro frontend a statické HTML/JS soubory.
- Kontext: Projekt už obsahuje SQL schéma a data v databázovém modelu, a je potřeba je skutečně využít v běžícím provozu místo lokálního mock datového objektu.
- Důvod: Tím je zajištěna skutečná data pro plánování, lepší škálovatelnost a možnost budoucího rozšíření o autentizaci a další funkce.

### 2026-09-19 – Samostatná tabulka typů jídel
- Rozhodnutí: Typ jídla nebude ukládán do názvu superkategorie, ale v samostatné tabulce `food_types`; každá superkategorie bude mít sloupec `food_type_id`, který určuje, zda se jedná o snídani, hlavní jídlo, přílohu, snack nebo nevaření.
- Kontext: Klient upřesnil, že rozdělení na typ jídla má být mimo samotné superkategorie, aby bylo oddělené od detailního seskupení jídel a umožnilo se to rozšiřovat bez změny názvů superkategorií.
- Důvod: Tím se zachová čistá hierarchie dat: typ jídla = obecná třída, superkategorie = konkrétní skupina v katalogu, kategorie = detaily jídla.

### 2026-09-19 – Rozvržení hlavní stránky a navigace
- Rozhodnutí: Levá lišta se stane funkční navigací a pravý sloupec se zredukuje na jednoduché pole pro přidání nového jídla.
- Kontext: Hlavní stránka má obsahovat přehled plánování a zároveň přístup k seznamu jídel s vyhledáváním a přidáváním, bez zbytečného katalogu v pravém panelu.
- Důvod: Uživatel chce rychlý přístup k jídelnímu katalogu z levé navigace a čistší pracovní plochu pro plánování týdne.

### 2026-09-19 – Výběr jídla přes celoobrazovkový modal
- Rozhodnutí: V každém slotu se zobrazuje pouze čtený přehled vybraného jídla a změna/volba jídla probíhá přes tlačítko, které otevře celoobrazovkové okno s filtrováním podle nadkategorie, kategorie, podkategorie a vyhledáváním.
- Kontext: Klient požadoval, aby uživatel nemusel upravovat název jídla přímo v poli a aby byl proces výběru přehledný a filtrován podle klasifikační struktury.
- Důvod: Tento model odděluje zobrazení od editace, zlepšuje přehlednost plánu a umožňuje rychlejší práci s větším katalogem jídel, aniž by se náhodně změnilo jídlo ve slotu.

### 2026-09-19 – Funkční sekce mrazák a zásoby
- Rozhodnutí: V levém panelu jsou funkční tlačítka pro mrazák i zásoby a v přehledu se aktualizují skutečné počty podle uložených položek.
- Kontext: Sekce mrazák a zásoby měly být v prototypu jen statickým výpisem dat a nepracovaly se záznamy ani s úpravami množství.
- Důvod: Uživatel potřebuje evidovat zbytky v mrazáku i trvanlivé suroviny v reálném čase, včetně rychlých úprav množství z mobilního i desktopového rozhraní.

### 2026-09-19 – Rozdílná vazba pro mrazák a zásoby
- Rozhodnutí: Položky v mrazáku a zbytcích mají odkaz na katalog `foods` přes `food_id`, zatímco trvanlivé ingredience v zásobách jsou samostatné záznamy bez vazby na `foods`.
- Kontext: Zbytky v mrazáku jsou vázané na konkrétní jídlo, které se vařilo nebo zůstalo po jídle, ale trvanlivé ingredience jako maso, mléko nebo koření nejsou definované v katalogu jídel a měly by být vedeny jako samostatné položky.
- Důvod: Jedná se o odlišné datové entity: mrazák eviduje zbytky jídel, zásoby evidují trvanlivé ingredience, a jejich model má být jednoduchý, přehledný a odpovídající skutečné domácí evidenci.

### 2026-09-19 – Databázový model pro mrazák a zásoby
- Rozhodnutí: Do databázového schématu se přidají samostatné tabulky `freezer_items` a `stock_items`; `freezer_items` obsahuje `food_id` odkazující na `foods`, zatímco `stock_items` neobsahuje vazbu na `foods` a ukládá pouze název, množství, jednotku, datum spotřeby a kategorii.
- Kontext: Projekt potřebuje nejen frontendové záznamy, ale i SQL definici pro pozdější provoz v Supabase nebo SQLite.
- Důvod: Tím je zachována logika domácí evidence: zbytky jídel mají katalogový odkaz, trvanlivé ingredience ne.

### 2026-09-21 – Ukládání nových jídel do katalogu přes server
- Rozhodnutí: Při přidání nového jídla v katalogu se data ukládají přes API endpoint `/api/foods`, který vytváří nebo hledá správnou superkategorii, kategorii a typ jídla v databázi a udržuje vazbu na `foods`.
- Kontext: Frontend si jídlo přidal pouze lokálně v rozhraní, ale nebylo to skutečně persistováno do databáze Supabase.
- Důvod: Katalog jídel má být plně uložený a obnovitelný, nikoliv jen krátkodobě zobrazený v prohlížeči.

### 2026-09-29 – Rozšíření o samostatný modul měsíčního rozpočtu
- Rozhodnutí: Aplikace bude rozšířena o samostatnou sekci Rozpočet, která pracuje s měsíčním plánem, kategoriemi příjmů a výdajů a transakcemi a je plně oddělena od stávající části Food Planner.
- Kontext: Klient požadoval funkci pro měsíční plán rozpočtu, evidenci výdajů a upozornění na překročení rozpočtu. Rozpočet má fungovat jako samostatná část aplikace, aby se data jídelního plánu a rozpočtu neovlivňovala.
- Důvod: Tím se zachová jednoduchost, přehlednost a nezávislost jednotlivých modulů, přičemž rozpočet může být rozšiřován samostatně bez zásahu do plánování jídel a zásob.

### 2026-09-29 – Globální rozpočet bez měsíčních izolovaných plánů
- Rozhodnutí: Rozpočet je globální pro všechny měsíce, zatímco měsíc v rozhraní slouží pouze jako filtr zobrazení a orientace v datech, nikoli jako samostatný rozpočtový plán.
- Kontext: Uživatel explicitně požadoval, aby se změna limitu nebo rozpočtu provedla jednou pro všechna měsíce a aby nebylo možné přepínat mezi samostatnými měsíčními rozpočty. Také bylo požadováno, aby byla data vázána na existující databázový model aplikace a aby bylo možné přidat kategorie a transakce v jednom globálním nastavení.
- Důvod: Tento model odpovídá běžnému domácímu rozpočtu, kde jsou limity a kategorie stabilní a měsíční pohled slouží jen pro filtrování výdajů a přehlednost. Zároveň to snižuje složitost dat a eliminuje nejasnosti při úpravách rozpočtu během roku.

### 2026-09-29 – SQL model pro rozpočet a transakce
- Rozhodnutí: Rozpočet se ukládá do tří tabulek: `budgets`, `budget_categories` a `budget_transactions`.
- Kontext: Uživatel chtěl SQL dotaz pro vytvoření potřebných tabulek na serveru a požadoval oddělení dat rozpočtu od plánování jídel. Datové struktury musí být připojitelné k existující databázi a mít jednoduchý model pro globální rozpočet.
- Důvod: Třístupňový model umožňuje mít jeden aktivní rozpočet, definované kategorie s limity a transakce pro jednotlivé dny a měsíce. To je dostatečně jednoduché pro domácnost, ale zároveň rozšiřitelné pro budoucí analýzu a grafy.

## 3. Záznam změn
- Všechny navržené úpravy se zapisují sem, a to i v případě, že jsou pouze v prototypové fázi.
- Poté, co je rozhodnutí přijato, je považováno za platné pro další vývoj.
- Pokud se později rozhodnutí změní, je nutné přidat nový záznam s datem a vysvětlením změny.

## 4. Hlavní zdroj pravdy
- Tento soubor je považován za hlavní zdroj pravdy o projektu.
- Všechny návrhy, změny, rozhodnutí a rozšíření musí být v souladu s tímto záznamem.
- Pokud je potřeba rozhodnout mezi variantami, musí být varianty a důvody zapsány zde.
