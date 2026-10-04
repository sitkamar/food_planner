# Rozhodnutí a změny projektu – Food Planner

Tento soubor je hlavním zdrojem pravdy o projektu. Všechny důležité rozhodnutí, změny, doplňky a návrhy se zapisují sem, aby se na ně později nemohlo zapomenout.

## 1. Základní pravidla
- Všechny důležité změny musí být zaznamenány zde.
- Rozhodnutí musí obsahovat důvod, kontext a datum.
- Pokud je navržena změna, musí být zaznamenána i s dopadem na projekt.
- Pokud není rozhodnutí zapsáno, považuje se za nejasné.

## 2. Rozhodnutí k projektu

### 2026-10-04 – Zachování zvoleného modulu v URL
- Rozhodnutí: Volba mezi Food Plannerem a Budget Plannerem se ukládá do parametru URL `app=food` nebo `app=budget`; modul se obnoví po načtení stránky a reaguje na navigaci zpět/vpřed.
- Kontext: Uživatel požádal, aby po obnovení stránky zůstala otevřená stejná část aplikace.
- Důvod: URL je sdílitelný a obnovitelný zdroj stavu, který nevyžaduje ukládání volby do dat aplikace.

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

### 2026-10-04 – Výběr kategorií a úprava jídel v katalogu
- Rozhodnutí: Formulář katalogu nabídne již použité kategorie a podkategorie jako našeptávané možnosti, ale zachová možnost zadat vlastní hodnotu. Každé jídlo půjde upravit podle jeho interního `food_id`, včetně názvu a zařazení.
- Kontext: Uživatel požádal o omezení překlepů při zadávání klasifikace a možnost opravit existující jídla přímo z katalogu.
- Důvod: Našeptávání usnadní opakované použití stejného zařazení bez zavedení tagů či dalšího klasifikačního modelu; identifikátor umožní bezpečně upravit jídla se stejným názvem.
- Doplnění: Nativní `datalist` byl nahrazen vlastním rozbalovacím seznamem s viditelnou šipkou, protože jeho ovládání není mezi prohlížeči jednotné. Tím zůstává výběr existujících hodnot dostupný i ve Firefoxu.

### 2026-10-04 – Řazení a jídelní lístek katalogu
- Rozhodnutí: Katalog nabídne seznam řazený podle názvu nebo data přidání a samostatný pohled jídelního lístku. V jídelním lístku představuje každá nadkategorie samostatnou stránku, kategorie jsou nadpisy a podkategorie se zobrazí v závorce za názvem jídla.
- Kontext: Uživatel požádal o přehlednější katalog s časovým řazením a podobou restauračního lístku.
- Důvod: Tabulka `foods` již obsahuje `created_at`, takže lze datum použít bez změny databázového schématu; seskupení zachová existující hierarchii klasifikace.

### 2026-10-04 – Přechod na příští týden od soboty
- Rozhodnutí: Při prvním zobrazení plánovací stránky a po volbě „Dnes“ bude od soboty jako první nabídnut následující týden.
- Kontext: Uživatel plánuje následující týdenní jídla předem a po pátku považuje plán aktuálního týdne za hotový.
- Důvod: Týdenní rozsahy a jejich nadpisy zůstávají v kalendářním rytmu pondělí až neděle; mění se pouze výběr prvního týdne plánovacího okna.

### 2026-10-04 – Jídelní lístek při výběru jídla do plánu
- Rozhodnutí: Výběrové okno pro týdenní plán nabídne vedle seznamu také jídelní lístek se stránkami podle nadkategorií, kategoriemi jako nadpisy a podkategorií v závorce u jídla.
- Kontext: Uživatel požádal o stejné restaurační zobrazení při výběru jídla do týdenního plánu jako v katalogu.
- Důvod: Jednotné zobrazení usnadní výběr z většího katalogu, zatímco současné filtry a ukládání jídla do slotu zůstávají zachované.

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

### 2026-10-04 – Přepínání modulu a načítání historie rozpočtu
- Rozhodnutí: Přepínání mezi Food Plannerem a Budget Plannerem je dostupné kliknutím na název aktuálního modulu v horní části levé navigace. Rozhraní rozpočtu načítá celou historii transakcí, aby bylo možné nabídnout měsíce, ve kterých již existují záznamy.
- Kontext: Uživatel požádal o přesun přepínače z dolní části levé navigace nahoru a o opravu nedostupných transakcí z minulého měsíce.
- Důvod: Název aplikace poskytuje přímé přepnutí modulu a seznam dostupných měsíců lze spolehlivě sestavit pouze z načtených transakcí; počet domácích záznamů je malý a měsíční přehled zůstává filtrem nad globálním rozpočtem.

### 2026-10-04 – Přesnost částek rozpočtu na celé koruny
- Rozhodnutí: Limity kategorií a částky transakcí lze zadávat po jednotlivých korunách.
- Kontext: Dosavadní formuláře vyžadovaly násobky sta korun, což nestačilo pro přesný domácí rozpočet.
- Důvod: Krok číselných polí odpovídá požadované přesnosti a částky se nadále zobrazují v celých korunách.

### 2026-10-04 – Oprava změny množství v zásobách a mrazáku
- Rozhodnutí: Tlačítka v zásobách mění množství o 0,1 kg a tlačítka v mrazáku o jednu porci; položky se vyhledávají podle textového ID bez převodu na číslo.
- Kontext: Textová ID položek inventáře se při číselném porovnání neshodovala, a tlačítka proto množství neměnila.
- Důvod: Ukládání i zobrazení změny musí fungovat pro všechny typy ID používané položkami inventáře.

### 2026-10-04 – Jednotky pro zásoby
- Rozhodnutí: Zásoby používají pouze jednotky `kg` a `balení`; změna množství je 0,1 kg nebo jedno celé balení podle zvolené jednotky.
- Kontext: Uživatel požádal o oddělené sledování ingrediencí podle kilogramů a počtu balení a o výběr jednotky ze seznamu.
- Důvod: Pevná nabídka jednotek předchází nejednotným zápisům a umožňuje správný krok tlačítek.

### 2026-10-04 – Odstranění vyčerpané položky zásob
- Rozhodnutí: Při odečtení posledního množství se položka odstraní z uloženého seznamu i zobrazení.
- Kontext: Uživatel upozornil, že záznam s nulovým množstvím nemá zůstávat v inventáři.
- Důvod: Seznam zásob má zobrazovat pouze dostupné množství.

### 2026-10-04 – Ukládání inventáře do databáze
- Rozhodnutí: Mrazák a zásoby se načítají a mění přes serverové API nad tabulkami `freezer_items` a `stock_items`; zápisy vyžadují platnou relaci pozvaného uživatele.
- Kontext: Uživatel požádal o napojení přidávání, změny množství a odstraňování inventáře na připravené databázové tabulky.
- Důvod: Databáze je společným zdrojem dat pro zařízení domácnosti; server používá privilegovaný klíč pouze po ověření přihlášení a nabídne pouze povolené tabulky.
- Doplnění: Stávající lokální položky se převedou do databáze pouze tehdy, je-li jejich tabulka prázdná; lokální úložiště pak slouží jako cache.
- Doplnění: Uživatel potvrdil zachování vazby položek mrazáku na katalog jídel přes `food_id`. Vzdálené Data API tento sloupec neuvádí, proto je připravena idempotentní migrace `supabase_inventory_migration.sql`, která ho doplní nebo obnoví cache API.

### 2026-10-04 – Aktuální měsíc v přehledu rozpočtu
- Rozhodnutí: Po obnovení stránky se rozpočet otevře na aktuálním měsíci. Tlačítko „Aktuální“ vrátí měsíční filtr k dnešnímu měsíci a týdenní ovládání se v modulu rozpočtu nezobrazuje.
- Kontext: Uživatel požádal o odstranění ovládání určeného pro plánování týdnů z rozpočtu a o rychlý návrat z historického měsíce.
- Důvod: Aktuální měsíc je výchozím a nejčastějším pohledem; zachování týdenního ovládání pouze ve Food Planneru předchází záměně mezi moduly.

### 2026-10-04 – Rozdělení Budget Planneru na tři sekce
- Rozhodnutí: Budget Planner má samostatné pohledy Přehled, Transakce a Budgety. Přehled kombinuje souhrnné hodnoty, čerpání, upozornění a trend s rychlým formulářem transakce. Transakce nabízí měsíční seznam, hledání, filtry a úpravu i mazání. Budgety spravují kategorie a jejich měsíční limity.
- Kontext: Uživatel požádal o rozdělení rozpočtové části do tří sekcí v levé navigaci a popsal jejich hlavní úlohy.
- Důvod: Oddělení každodenního přehledu, evidence jednotlivých transakcí a správy rozpočtových kategorií zjednodušuje orientaci a ponechává stávající model globálních kategorií s měsíčním filtrem transakcí.

### 2026-10-04 – Obnova hesla přes e-mailový odkaz
- Rozhodnutí: Přihlašovací stránka umožní vyžádat e-mail pro obnovu hesla; po události Supabase Auth `PASSWORD_RECOVERY` nabídne zadání a potvrzení nového hesla, které uloží přes `updateUser`.
- Kontext: Uživatel požádal o možnost vytvořit nové heslo po otevření jednorázového odkazu zaslaného Supabase.
- Důvod: Obnova používá ověřenou relaci vytvořenou jednorázovým odkazem a nepředává heslo serveru aplikace.
- Doplnění: Žádost o obnovu se vrací na kořen aplikace, který zachytí `PASSWORD_RECOVERY` nebo recovery fragment a přesměruje na přihlašovací formulář v režimu obnovy. Tím se respektuje aktuální adresa projektu Supabase.

### 2026-10-04 – Výběr dne transakce v rámci zvoleného měsíce
- Rozhodnutí: Formulář transakce vybírá pouze den; rok a měsíc se automaticky převezmou z právě vybraného měsíce rozpočtu. Nabídka dnů respektuje délku měsíce včetně přestupného roku.
- Kontext: Uživatel požádal o zjednodušení zadávání data, protože měsíc a rok už určuje hlavní měsíční filtr.
- Důvod: Jediné měsíční nastavení zamezuje rozporu mezi filtrem a datem transakce a omezení počtu dnů brání neplatným datům.

### 2026-10-04 – Kumulovaný trend a rozdělení výdajů v grafu
- Rozhodnutí: Přehled rozpočtu zobrazuje line chart kumulovaného finančního stavu od počáteční nuly před prvním měsícem s transakcemi; každý měsíční bod už zahrnuje bilanci daného měsíce. Vedle něj je pie chart skutečných výdajů podle kategorií ve vybraném měsíci.
- Kontext: Uživatel požádal o nahrazení dosavadního vývoje mezi měsíci spojnicovým grafem a doplnění koláčového grafu čerpání kategorií.
- Důvod: Kumulovaný součet měsíčních příjmů a výdajů ukazuje směr celkového vývoje včetně aktuální bilance prvního měsíce; koláčové rozdělení zpřehledňuje podíl jednotlivých kategorií na výdajích vybraného měsíce.

### 2026-10-04 – Zachování přehledu čerpání budgetů
- Rozhodnutí: Pie chart rozdělení výdajů doplňuje samostatný pruhový přehled skutečného čerpání každého výdajového budgetu vůči jeho limitu.
- Kontext: Uživatel upřesnil, že vedle nového pie chartu chce zachovat i původní srovnání využití budgetů podle kategorií.
- Důvod: Koláčový graf porovnává podíly na celkových výdajích, zatímco pruhy ukazují plnění limitu jednotlivých kategorií; oba pohledy odpovídají rozdílným otázkám.

### 2026-10-04 – Dvouřadé rozložení grafů přehledu
- Rozhodnutí: Přehled zobrazuje využití budgetů vlevo a pie chart vpravo v horní řadě; ve spodní řadě je vlevo kumulovaný vývoj a vpravo upozornění.
- Kontext: Uživatel upřesnil pořadí a sousedství jednotlivých grafů a upozornění na přehledu.
- Důvod: Dvojice souvisejících grafů je vedle sebe, zatímco průběh a upozornění tvoří druhou srovnatelnou řadu.

### 2026-10-04 – Mobilní pořadí rychlého zadání transakce
- Rozhodnutí: Na telefonu se formulář pro přidání transakce zobrazuje před obsahem Přehledu i Transakcí; jednotlivé transakční řádky skládají popis, částku a akce bez úzkých textových sloupců.
- Kontext: Uživatel požádal o upřednostnění přidání transakce a o čitelnější seznam na telefonu, přičemž sekce Budgety má zůstat beze změny.
- Důvod: Mobilní tok dává nejčastější akci na začátek a umožňuje přečíst informace o transakci v dostupné šířce displeje.

## 3. Záznam změn
- Všechny navržené úpravy se zapisují sem, a to i v případě, že jsou pouze v prototypové fázi.
- Poté, co je rozhodnutí přijato, je považováno za platné pro další vývoj.
- Pokud se později rozhodnutí změní, je nutné přidat nový záznam s datem a vysvětlením změny.

## 4. Hlavní zdroj pravdy
- Tento soubor je považován za hlavní zdroj pravdy o projektu.
- Všechny návrhy, změny, rozhodnutí a rozšíření musí být v souladu s tímto záznamem.
- Pokud je potřeba rozhodnout mezi variantami, musí být varianty a důvody zapsány zde.
