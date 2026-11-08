// Category rules and helpers for Connections, Top 10, Customs and Flag Pie (the same categories as Countries).
// The country data itself is NOT here: it comes from the Geomingo country database, ../data/countries.js (C, EXTRA, DATA) and, in games that show flags,
// ../data/flags.js (FLAGS). Load those first, then this file, with plain <script> tags: everything here is a global.

const N = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z]/g,'');
C.forEach((c,i)=>{c.i=i;c.k=N(c.n);c.ak=c.al.map(N);c.letters=c.k;});
const byCode = Object.fromEntries(C.map(c=>[c.c,c]));
const LEFT = new Set('GBR IRL MLT CYP IND PAK BGD LKA NPL BTN MDV JPN THA MYS SGP IDN BRN TLS AUS NZL PNG FJI SLB TON WSM KIR TUV NRU ZAF LSO SWZ BWA NAM ZWE ZMB MOZ MWI TZA KEN UGA MUS SYC JAM TTO BRB BHS GUY SUR ATG KNA LCA VCT GRD DMA HKG MAC BMU CYM VGB VIR AIA MSR TCA FLK SHN CCK CXR NFK COK NIU PCN IMN JEY GGY'.split(' '));
const has = (c,l)=>c.lg.includes(l);

/* ---- categories ---- */
const CATS = [];
const add=(fam,label,test)=>CATS.push({id:CATS.length,fam,label,test});
[['AF','In Africa'],['EU','In Europe'],['AS','In Asia'],['OC','In Oceania'],['NA','In North or Central America'],['SA','In South America']].forEach(([r,l])=>add('region',l,c=>c.r===r));
['CHN','RUS','IND','BRA','FRA','DEU','AUT','COD','TZA','TUR','SRB','SAU','ARG','HUN','NER','ZMB','IRN','PER'].forEach(k=>add('border','Borders '+byCode[k].n,c=>c.b.includes(k)));
add('geo','Landlocked',c=>c.ll===1);
add('geo','Island nation (no land borders)',c=>c.b.length===0&&!c.ll);
add('geo','Has 5+ land neighbours',c=>c.b.length>=5);
add('geo','Exactly 1 land neighbour',c=>c.b.length===1);
add('geo','Centre south of the Equator',c=>c.lat<0);
add('geo','Centre in the tropics',c=>Math.abs(c.lat)<23.4);
add('geo','Centre north of 45°N',c=>c.lat>45);
add('geo','Area over 1 million km²',c=>c.a>1e6);
add('geo','Area under 30,000 km²',c=>c.a<3e4);
add('geo','Area over 2 million km²',c=>c.a>2e6);
add('geo','Area under 1,000 km²',c=>c.a>0&&c.a<1000);
add('geo','Exactly 2 land neighbours',c=>c.b.length===2);
add('geo','3 or 4 land neighbours',c=>c.b.length>=3&&c.b.length<=4);
// population: UN estimate for 1 July 2023; places without a UN figure never count
const POP=c=>DATA.pop[c.c];
add('people','Population over 100 million',c=>POP(c)>1e8);
add('people','Population over 50 million',c=>POP(c)>5e7);
add('people','Population under 1 million',c=>POP(c)<1e6);
add('people','Population under 100,000',c=>POP(c)<1e5);
// development and economy: a place without a figure in the source never counts
const V=(k,c)=>DATA[k][c.c],HASV=(k,c)=>DATA[k][c.c]!==undefined;
add('dev','Very high development (HDI 0.9+)',c=>V('hdi',c)>=0.9);
add('dev','HDI 0.95 or higher',c=>V('hdi',c)>=0.95);
add('dev','Low development (HDI under 0.55)',c=>HASV('hdi',c)&&V('hdi',c)<0.55);
add('dev','GDP per person over $50,000',c=>V('gdp',c)>50000);
add('dev','GDP per person under $1,000',c=>HASV('gdp',c)&&V('gdp',c)<1000);
add('dev','Life expectancy over 80',c=>V('life',c)>80);
add('dev','Life expectancy under 65',c=>HASV('life',c)&&V('life',c)<65);
add('dev','Median age over 40',c=>V('age',c)>40);
add('dev','Median age under 20',c=>HASV('age',c)&&V('age',c)<20);
add('dev','Least corrupt (CPI 70+)',c=>V('cpi',c)>=70);
add('dev','Most corrupt (CPI under 25)',c=>HASV('cpi',c)&&V('cpi',c)<25);
add('dev','CO₂ over 10 t per person',c=>V('co2',c)>10);
add('dev','Has nuclear power plants',c=>DATA.nuclear.includes(c.c));
// politics and history
const IN=k=>c=>DATA[k].includes(c.c);
add('pol2','Is a territory (not independent)',c=>c.t===1);
add('pol2','Has nuclear weapons',IN('nukes'));
add('pol2','Arab League member',IN('arab'));
add('pol2','ASEAN member',IN('asean'));
add('pol2','APEC member',IN('apec'));
add('pol2','Antarctic Treaty party',IN('antarctic'));
add('pol2','No standing army',IN('noarmy'));
add('people','Over 90% urban population',c=>V('urban',c)>=90);
add('people','Under 25% urban population',c=>HASV('urban',c)&&V('urban',c)<25);
add('hist','Independence from the UK',IN('ind_uk'));
add('hist','Independence from Spain',IN('ind_es'));
// geography and sport
add('geo3','Coastline over 10,000 km',c=>V('coast',c)>10000);
add('geo3','Coastline under 100 km',c=>V('coast',c)>0&&V('coast',c)<100);
add('geo3','Highest point under 500 m',c=>HASV('elev',c)&&V('elev',c)<500);
add('geo3','Land borders over 5,000 km',c=>V('landb',c)>5000);
add('geo3','Forest covers over 60%',c=>V('forest',c)>60);
add('geo3','Forest covers under 5%',c=>HASV('forest',c)&&V('forest',c)<5);
add('sport2','100+ Olympic medals',c=>V('olymp',c)>=100);
add('sport2','500+ Olympic medals',c=>V('olymp',c)>=500);
add('sport2','Never won an Olympic medal',c=>!c.t&&!HASV('olymp',c));
add('sport2','Played the men\'s World Cup',IN('wc'));
add('sport2','Took part in Eurovision',IN('euro'));
add('pol2','Has a metro system',IN('metro'));
add('misc','Drives on the left',c=>LEFT.has(c.c));
['A','B','C','G','M','N','S','T','L','K','P'].forEach(L=>add('name','Name starts with '+L,c=>c.k[0]===L.toLowerCase()));
add('name','Name ends in "-ia"',c=>c.k.endsWith('ia'));
add('name','Name ends in "-stan"',c=>c.k.endsWith('stan'));
add('name','Name ends in "-land"',c=>/lands?$/.test(c.k)&&!/islands?$/.test(c.k));
add('name','Name has 5 letters or fewer',c=>c.k.length<=5);
add('name','Name has 10+ letters',c=>c.k.length>=10);
add('name','Name of 2+ words',c=>/\s/.test(c.n.trim()));
add('name','Name contains Z',c=>c.k.includes('z'));
add('name','Starts and ends with the same letter',c=>c.k[0]===c.k[c.k.length-1]);
add('lang','Official language: English',c=>has(c,'English'));
add('lang','Official language: French',c=>has(c,'French'));
add('lang','Official language: Spanish',c=>has(c,'Spanish'));
add('lang','Official language: Arabic',c=>has(c,'Arabic'));
add('lang','Official language: Portuguese',c=>has(c,'Portuguese'));
add('money','Uses the euro',c=>c.cu.includes('EUR')&&c.r==='EU'); // European places only: no overseas territories
add('money','Currency called "dollar"',c=>c.d===1);
// capitals that are disputed, moving or ambiguous (DATA.cap_skip) never count in capital categories
const CAPOK=c=>!!c.cap&&!DATA.cap_skip.includes(c.c),CAPPOP=c=>DATA.cappop[c.c];
add('cap','Capital starts with same letter',c=>CAPOK(c)&&N(c.cap)[0]===c.k[0]);
add('cap','Capital name has 2+ words',c=>CAPOK(c)&&/\s/.test(c.cap.trim()));
['B','M','P','S'].forEach(L=>add('cap','Capital starts with '+L,c=>CAPOK(c)&&N(c.cap)[0]===L.toLowerCase()));
add('cap','Capital over 1 million people',c=>CAPOK(c)&&CAPPOP(c)>=1e6);
add('cap','Capital under 100,000 people',c=>CAPOK(c)&&CAPPOP(c)<1e5);
add('cap','Capital is not the largest city',c=>DATA.cap_notlargest.includes(c.c));
// ---- categories from hand-checked lists (flags measured and checked on the flags shown in the game) ----
const inList=k=>{const set=new Set(EXTRA[k]);return c=>set.has(c.c)};
[['flag_blue','Flag has blue'],['flag_green','Flag has green'],['flag_yellow','Flag has yellow or gold'],['flag_black','Flag has black'],['flag_orange','Flag has orange']].forEach(([k,l])=>add('flagc',l,inList(k)));
add('flagc','No red on the flag',c=>!EXTRA.flag_red.includes(c.c));
add('flagc','Flag of exactly 2 colours',inList('flag_two'));
add('flagc','Flag of exactly 3 colours',inList('flag_three'));
[['flag_star','Flag has a star'],['flag_moon','Flag has a crescent moon'],['flag_sun','Flag has a sun'],['flag_cross','Flag has a cross'],['flag_uj','Flag has the Union Jack'],['flag_arms','Flag has a coat of arms or seal'],['flag_animal','Flag has an animal']].forEach(([k,l])=>add('flags',l,inList(k)));
[['sea_med','Coast on the Mediterranean'],['sea_carib','Coast on the Caribbean Sea'],['sea_baltic','Coast on the Baltic Sea'],['sea_black','Coast on the Black Sea'],['sea_red','Coast on the Red Sea'],['sea_gulf','Coast on the Persian Gulf'],['sea_caspian','Coast on the Caspian Sea'],['sea_north','Coast on the North Sea']].forEach(([k,l])=>add('sea',l,inList(k)));
add('geo2','Crossed by the Equator',inList('geo_equator'));
add('geo2','Has a peak over 5,000 m',inList('geo_5000'));
[['pol_eu','EU member'],['pol_nato','NATO member'],['pol_cw','Commonwealth member'],['pol_g20','G20 member'],['pol_mon','Monarchy'],['pol_opec','OPEC member'],['pol_ussr','Former Soviet republic']].forEach(([k,l])=>add('pol',l,inList(k)));
[['sp_summer','Hosted the Summer Olympics'],['sp_winter','Hosted the Winter Olympics'],['sp_wchost','Hosted the men\'s World Cup'],['sp_wcwin','Won the men\'s World Cup'],['sp_f1','Hosts a Formula 1 race (2026)']].forEach(([k,l])=>add('sport',l,inList(k)));
CATS.forEach(k=>{k.set=C.map(c=>!!k.test(c));k.count=k.set.filter(Boolean).length;});
const FLAGNOTE='Judged on the flag shown in the game.';
const NOTE=(what,page)=>'Source: '+what+', as listed in Wikipedia, "'+page+'". Places with no figure there never count.';
const POPNOTE='United Nations estimate for 1 July 2023 (Wikipedia, "List of countries by population (United Nations)"). Places with no UN figure never count.';
const CAPNOTE='Source: Wikipedia, "List of national capitals by population". Countries with a disputed or moving capital (Sri Lanka, Eswatini, Equatorial Guinea, Western Sahara, Montserrat, Tokelau) never count in capital categories.';
const NAMEWORD='Uses the English name shown in this game (for example "Ivory Coast", "Czechia", "DR Congo"). Spaces, hyphens and accents are ignored.';
function describe(k){
  const L=k.label;let m;
  if(m=/^In (.+)$/.exec(L)){const extra={'Europe':' Russia and Cyprus count as Europe here.','Asia':' Turkey, Georgia, Armenia, Azerbaijan and Kazakhstan count as Asia here.','North or Central America':' Includes the Caribbean, Central America and Mexico.','Oceania':' Australia, New Zealand and the Pacific islands.','Africa':' Egypt counts as Africa.','South America':' The 12 countries of the South American mainland.'};return 'The country belongs to '+m[1]+'.'+(extra[m[1]]||'')}
  if(m=/^Borders (.+)$/.exec(L))return 'Shares a land border with '+m[1]+'. Sea borders and bridges do not count.';
  const D={
    'Landlocked':'Has no coastline on the open sea. A coast only on the Caspian Sea does not count, so Kazakhstan and Azerbaijan are landlocked here.',
    'Island nation (no land borders)':'Has no land border with any other country. Countries sharing an island with a neighbour, like Haiti or Ireland, do not count.',
    'Has 5+ land neighbours':'Shares a land border with at least 5 different countries.',
    'Exactly 1 land neighbour':'Shares a land border with exactly one country.',
    'Centre south of the Equator':'The geographic centre of the country is south of the Equator. Countries crossing the Equator count by where their centre is.',
    'Centre in the tropics':'The geographic centre lies between the Tropic of Cancer (23.4°N) and the Tropic of Capricorn (23.4°S).',
    'Centre north of 45°N':'The geographic centre is north of latitude 45°N, roughly the line through Bordeaux, Turin and Ottawa.',
    'Area over 1 million km²':'Total area (land and inland water) above 1,000,000 km².',
    'Area under 30,000 km²':'Total area below 30,000 km², a bit smaller than Belgium.',
    'Population over 100 million':'Has more than 100 million inhabitants. '+POPNOTE,
'Population over 50 million':'Has more than 50 million inhabitants. '+POPNOTE,
'Population under 1 million':'Has fewer than 1 million inhabitants. '+POPNOTE,
'Population under 100,000':'Has fewer than 100,000 inhabitants. '+POPNOTE,
'Area over 2 million km²':'Total area (land and inland water) above 2,000,000 km².',
'Very high development (HDI 0.9+)':'Human Development Index of 0.900 or more. The HDI combines life expectancy, schooling and income. '+NOTE('UNDP figures for 2023','List of countries by Human Development Index'),
'HDI 0.95 or higher':'Human Development Index of 0.950 or more, the very top of the ranking. '+NOTE('UNDP figures for 2023','List of countries by Human Development Index'),
'Low development (HDI under 0.55)':'Human Development Index below 0.550 ("low human development"). '+NOTE('UNDP figures for 2023','List of countries by Human Development Index'),
'GDP per person over $50,000':'Nominal GDP per person above 50,000 US dollars. '+NOTE('World Bank figures, 2025 column','List of countries by GDP (nominal) per capita'),
'GDP per person under $1,000':'Nominal GDP per person below 1,000 US dollars. '+NOTE('World Bank figures, 2025 column','List of countries by GDP (nominal) per capita'),
'Life expectancy over 80':'Life expectancy at birth above 80 years. '+NOTE('UN figures for 2023','List of countries by life expectancy'),
'Life expectancy under 65':'Life expectancy at birth below 65 years. '+NOTE('UN figures for 2023','List of countries by life expectancy'),
'Median age over 40':'Half the population is older than 40. '+NOTE('CIA World Factbook, 2024 estimates','List of countries by median age'),
'Median age under 20':'Half the population is younger than 20. '+NOTE('CIA World Factbook, 2024 estimates','List of countries by median age'),
'Least corrupt (CPI 70+)':'Scores 70 or more out of 100 in the Corruption Perceptions Index (higher means cleaner). '+NOTE('Transparency International, 2025 index','Corruption Perceptions Index'),
'Most corrupt (CPI under 25)':'Scores below 25 out of 100 in the Corruption Perceptions Index (lower means more corruption perceived). '+NOTE('Transparency International, 2025 index','Corruption Perceptions Index'),
'CO₂ over 10 t per person':'Emits more than 10 tonnes of CO₂ per person a year. Only countries count, not territories. '+NOTE('figures for 2023','List of countries by carbon dioxide emissions per capita'),
'Coastline over 10,000 km':'The coastline is longer than 10,000 km. '+NOTE('CIA World Factbook figures','List of countries by length of coastline'),
'Coastline under 100 km':'Has a coast, but shorter than 100 km. Landlocked places do not count. '+NOTE('CIA World Factbook figures','List of countries by length of coastline'),
'Highest point under 500 m':'Even the highest point is lower than 500 m above sea level. The Netherlands does not count: Wikipedia gives its highest point as Mount Scenery (870 m) on the Caribbean island of Saba. '+NOTE('highest points','List of elevation extremes by country'),
'Land borders over 5,000 km':'All its land borders together are longer than 5,000 km. '+NOTE('total land border length','List of countries and territories by land borders'),
'Forest covers over 60%':'Forest covers more than 60% of the land. '+NOTE('forest share of land area','List of countries by forest area'),
'Forest covers under 5%':'Forest covers less than 5% of the land. '+NOTE('forest share of land area','List of countries by forest area'),
'100+ Olympic medals':'Has won at least 100 medals in all Summer and Winter Olympics together, up to the 2026 Winter Games. Medals won as part of a former team (Soviet Union, East Germany, Czechoslovakia...) are not added. '+NOTE('all-time totals','All-time Olympic Games medal table'),
'500+ Olympic medals':'Has won at least 500 medals in all Summer and Winter Olympics together, up to the 2026 Winter Games. '+NOTE('all-time totals','All-time Olympic Games medal table'),
'Never won an Olympic medal':'An independent country that has never won a medal at the Summer or Winter Olympics, up to the 2026 Winter Games. Territories do not count. Source: Wikipedia, "All-time Olympic Games medal table".',
'Played the men\'s World Cup':'Has played at least one men\'s FIFA World Cup finals, up to and including 2026. The United Kingdom counts through England, Scotland, Wales and Northern Ireland. Source: Wikipedia, "National team appearances in the FIFA World Cup".',
'Took part in Eurovision':'Has competed at least once in the Eurovision Song Contest. Countries only announced for a future contest do not count. Source: Wikipedia, "List of countries in the Eurovision Song Contest".',
'Has a metro system':'Has at least one metro (underground or rapid transit) system in service. Source: Wikipedia, "List of metro systems".',
'Is a territory (not independent)':'A place that is not an independent country, like Greenland, Puerto Rico or Hong Kong. The game marks these with "territory" in the country list.',
'Has nuclear weapons':'One of the eight countries that have declared nuclear weapons: United States, Russia, China, France, United Kingdom, India, Pakistan and North Korea. Israel never confirmed or denied having them, so it does not count. Source: Wikipedia, "List of states with nuclear weapons".',
'Arab League member':'A member state of the Arab League (22 members, including Palestine). Source: Wikipedia, "Member states of the Arab League".',
'ASEAN member':'A member of the Association of Southeast Asian Nations (11 members since Timor-Leste joined in October 2025). Source: Wikipedia, "Member states of ASEAN".',
'APEC member':'One of the 21 member economies of Asia-Pacific Economic Cooperation, which include Hong Kong and Taiwan. Source: Wikipedia, "Asia-Pacific Economic Cooperation".',
'Antarctic Treaty party':'Has signed and ratified (or acceded to) the Antarctic Treaty. Source: Wikipedia, "Antarctic Treaty System".',
'No standing army':'A sovereign country with no army: either no armed forces at all, like Iceland or Andorra, or only limited forces such as police units, like Costa Rica or Panama. Source: Wikipedia, "List of countries without armed forces".',
'Over 90% urban population':'At least 90% of the people live in urban areas. '+NOTE('UN figures for 2023','Urbanization by sovereign state'),
'Under 25% urban population':'Fewer than 25% of the people live in urban areas. '+NOTE('UN figures for 2023','Urbanization by sovereign state'),
'Independence from the UK':'An independent country that became independent from the United Kingdom (or the British Empire), including the old dominions such as Canada and Australia. Some were never formally colonies, like Afghanistan. Countries that split from another former colony later, like Singapore or Bangladesh, do not count. Source: Wikipedia, "List of countries that have gained independence from the United Kingdom".',
'Independence from Spain':'An independent country that became independent from Spain: most of Latin America, the Philippines, Equatorial Guinea and Morocco, and also the Netherlands (1648) and Portugal (1640). Source: Wikipedia, "List of countries that have gained independence from Spain".',
'Has nuclear power plants':'Has at least one nuclear reactor producing electricity. Countries that have closed all theirs, like Germany or Italy, do not count. '+NOTE('operating reactors','Nuclear power by country'),
'Area under 1,000 km²':'Total area below 1,000 km², smaller than the island of Menorca.',
'Exactly 2 land neighbours':'Shares a land border with exactly two countries.',
'3 or 4 land neighbours':'Shares a land border with three or four countries.',
'Capital over 1 million people':'The capital city has at least 1 million inhabitants within its city limits (not its whole metropolitan area). '+CAPNOTE,
'Capital under 100,000 people':'The capital city has fewer than 100,000 inhabitants within its city limits. '+CAPNOTE,
'Capital is not the largest city':'Another city in the country is bigger than the capital, like Sydney in Australia or Istanbul in Türkiye. Countries where this is disputed (China, Israel, Palestine, Equatorial Guinea) do not count. Source: Wikipedia, "List of countries whose capital is not their largest city".',
    'Drives on the left':'Traffic keeps to the left side of the road.',
    'Name ends in "-ia"':'The country name ends in the letters "ia". '+NAMEWORD,
    'Name ends in "-stan"':'The country name ends in "stan". '+NAMEWORD,
    'Name ends in "-land"':'The country name ends in "land" or "lands", like Finland or Netherlands. Names ending in "Island" or "Islands" do not count. '+NAMEWORD,
    'Name has 5 letters or fewer':'The country name has 5 letters or fewer. '+NAMEWORD,
    'Name has 10+ letters':'The country name has 10 letters or more, not counting spaces. '+NAMEWORD,
    'Name of 2+ words':'The country name is made of two or more words. '+NAMEWORD,
    'Name contains Z':'The country name contains the letter Z anywhere. '+NAMEWORD,
    'Starts and ends with the same letter':'The first and last letters of the country name are the same. '+NAMEWORD,
    'Uses the euro':'The euro is the official currency, including countries outside the EU that use it. Only places in Europe count: overseas territories like Martinique or Réunion do not.',
    'Currency called "dollar"':'The official currency is a dollar of any kind (US, Canadian, East Caribbean, etc.), including countries that use the US dollar.',
    'Capital starts with same letter':'The name of the capital starts with the same letter as the name of the country.',
    'Capital name has 2+ words':'The name of the capital is made of two or more words.',
'Capital starts with B':'The name of the capital starts with B, as shown in the game.',
'Capital starts with M':'The name of the capital starts with M, as shown in the game.',
'Capital starts with P':'The name of the capital starts with P, as shown in the game.',
'Capital starts with S':'The name of the capital starts with S, as shown in the game.',
    'Flag has blue':'Blue appears anywhere on the flag, including stars, emblems and coats of arms. Light blue counts. '+FLAGNOTE,
    'Flag has green':'Green appears anywhere on the flag, including stars, emblems and coats of arms. '+FLAGNOTE,
    'Flag has yellow or gold':'Yellow or gold appears anywhere on the flag, including stars, suns, emblems and coats of arms. '+FLAGNOTE,
    'Flag has black':'Black appears anywhere on the flag as a stripe, a symbol or part of an emblem. Thin outlines do not count. '+FLAGNOTE,
    'Flag has orange':'The flag has a clearly orange area, like India, Ireland or Niger. Gold does not count as orange. '+FLAGNOTE,
    'No red on the flag':'There is no red anywhere on the flag, not even in a star or emblem. Maroon, crimson and red-orange count as red. '+FLAGNOTE,
    'Flag of exactly 2 colours':'The flag uses exactly two colours, counting white and black, like Japan (red and white) or Ukraine (blue and yellow). Colours inside emblems count if clearly visible. '+FLAGNOTE,
    'Flag of exactly 3 colours':'The flag uses exactly three colours, counting white and black, like France or Germany. Colours inside emblems count if clearly visible. '+FLAGNOTE,
    'Flag has a star':'The flag shows at least one star of any size or number of points, including the Star of David. '+FLAGNOTE,
    'Flag has a crescent moon':'The flag shows a crescent moon, like Türkiye or Pakistan. A full round moon (Palau) does not count. '+FLAGNOTE,
    'Flag has a sun':'The flag shows a sun with rays, like Argentina or Kazakhstan. A plain disc (Japan, Bangladesh) does not count. '+FLAGNOTE,
    'Flag has a cross':'The flag shows a cross, upright or diagonal, like the Nordic flags, Switzerland, Greece or Jamaica. The crosses inside the Union Jack do not count. '+FLAGNOTE,
    'Flag has the Union Jack':'The British Union Jack appears on the flag, usually in the top-left corner. '+FLAGNOTE,
    'Flag has a coat of arms or seal':'The flag carries a coat of arms, shield, seal or national emblem, like Spain, Mexico or Portugal. A single symbol on its own (a star, a leaf, an eagle) does not count. '+FLAGNOTE,
    'Flag has an animal':'An animal appears on the flag, on its own or inside a coat of arms: birds, lions, a dragon, a sheep and so on. '+FLAGNOTE,
    'Coast on the Mediterranean':'Has a coastline on the Mediterranean Sea, including the Adriatic and Aegean. Bosnia and Herzegovina counts (Neum); the Black Sea does not.',
    'Coast on the Caribbean Sea':'Has a coastline on the Caribbean Sea. Islands facing only the open Atlantic (Bahamas, Barbados, Turks and Caicos) do not count.',
    'Coast on the Baltic Sea':'Has a coastline on the Baltic Sea, including its gulfs.',
    'Coast on the Black Sea':'Has a coastline on the Black Sea.',
    'Coast on the Red Sea':'Has a coastline on the Red Sea or its Gulf of Aqaba (Jordan, Israel). Djibouti counts at the Bab-el-Mandeb strait.',
    'Coast on the Persian Gulf':'Has a coastline on the Persian Gulf. Oman counts through its Musandam exclave.',
    'Coast on the Caspian Sea':'Has a coastline on the Caspian Sea.',
    'Coast on the North Sea':'Has a coastline on the North Sea.',
    'Crossed by the Equator':'The Equator crosses the country\'s land or territorial waters.',
    'Has a peak over 5,000 m':'The highest point is more than 5,000 metres above sea level, including peaks on a border.',
    'EU member':'A member state of the European Union (27 members).',
    'NATO member':'A member of NATO (32 members).',
    'Commonwealth member':'A member of the Commonwealth of Nations (56 members). Overseas territories do not count.',
    'G20 member':'One of the 19 countries in the G20. The EU and African Union are members too but are not countries.',
    'Monarchy':'The head of state is a monarch: a king, queen, emperor, emir, sultan, grand duke, prince or the Pope. Commonwealth realms with King Charles III count. Overseas territories do not count.',
    'OPEC member':'A member of OPEC, the Organization of the Petroleum Exporting Countries (12 members).',
    'Former Soviet republic':'One of the 15 republics of the former Soviet Union.',
    'Hosted the Summer Olympics':'Has hosted the Summer Olympic Games at least once. Moscow 1980 counts for Russia.',
    'Hosted the Winter Olympics':'Has hosted the Winter Olympic Games at least once, up to Milano Cortina 2026. Sarajevo 1984 counts for Bosnia and Herzegovina, Sochi 2014 for Russia.',
    'Hosted the men\'s World Cup':'Has hosted (or co-hosted) the men\'s FIFA World Cup, up to 2026. England 1966 counts for the United Kingdom.',
    'Won the men\'s World Cup':'Has won the men\'s FIFA World Cup, up to Spain\'s win in 2026. England counts as the United Kingdom.',
    'Hosts a Formula 1 race (2026)':'Hosts at least one Formula 1 Grand Prix on the 2026 calendar.'
  };
  if(D[L])return D[L];
  if(m=/^Name starts with (.)$/.exec(L))return 'The country name starts with the letter '+m[1]+'. '+NAMEWORD;
  if(m=/^Official language: (.+)$/.exec(L))return m[1]+' is one of the official national languages. Widely spoken but unofficial languages do not count.';
  return L+'.';
}
const SHORT={'Flag has blue':'Flag: blue','Flag has green':'Flag: green','Flag has yellow or gold':'Flag: yellow','Flag has black':'Flag: black','Flag has orange':'Flag: orange','No red on the flag':'No red in flag','Flag of exactly 2 colours':'2-colour flag','Flag of exactly 3 colours':'3-colour flag','Flag has a star':'Flag: star','Flag has a crescent moon':'Flag: crescent','Flag has a sun':'Flag: sun','Flag has a cross':'Flag: cross','Flag has the Union Jack':'Flag: Union Jack','Flag has a coat of arms or seal':'Flag: coat of arms','Flag has an animal':'Flag: animal','Coast on the Mediterranean':'Mediter\u00ADranean coast','Coast on the Caribbean Sea':'Caribbean coast','Coast on the Baltic Sea':'Baltic coast','Coast on the Black Sea':'Black Sea coast','Coast on the Red Sea':'Red Sea coast','Coast on the Persian Gulf':'Persian Gulf coast','Coast on the Caspian Sea':'Caspian coast','Coast on the North Sea':'North Sea coast','Crossed by the Equator':'On the Equator','Has a peak over 5,000 m':'Peak over 5,000 m','Hosted the Summer Olympics':'Hosted Summer Olympics','Hosted the Winter Olympics':'Hosted Winter Olympics','Hosted the men\'s World Cup':'Hosted World Cup','Won the men\'s World Cup':'Won World Cup','Hosts a Formula 1 race (2026)':'F1 race in 2026','Former Soviet republic':'Ex-Soviet republic','Commonwealth member':'Common\u00ADwealth'};
const SHORT0={'Coastline over 10,000 km':'Coast over 10,000 km','Coastline under 100 km':'Coast under 100 km','Highest point under 500 m':'Top point under 500 m','Land borders over 5,000 km':'Borders over 5,000 km','Forest covers over 60%':'60%+ forest','Forest covers under 5%':'Under 5% forest','100+ Olympic medals':'100+ Olympic medals','500+ Olympic medals':'500+ Olympic medals','Never won an Olympic medal':'No Olympic medal','Played the men\'s World Cup':'Played World Cup','Took part in Eurovision':'Euro­vision','Has a metro system':'Metro system',
  'Is a territory (not independent)':'Terri­tory','Has nuclear weapons':'Nuclear weapons','Arab League member':'Arab League','ASEAN member':'ASEAN','APEC member':'APEC','Antarctic Treaty party':'Antarctic Treaty','No standing army':'No army','Over 90% urban population':'90%+ urban','Under 25% urban population':'Under 25% urban','Independence from the UK':'Indep. from the UK','Independence from Spain':'Indep. from Spain',
  'Very high development (HDI 0.9+)':'HDI 0.9+','HDI 0.95 or higher':'HDI 0.95+','Low development (HDI under 0.55)':'HDI under 0.55','GDP per person over $50,000':'GDP/person over $50K','GDP per person under $1,000':'GDP/person under $1K','Life expectancy over 80':'Life expec­tancy 80+','Life expectancy under 65':'Life expec­tancy under 65','Median age over 40':'Median age 40+','Median age under 20':'Median age under 20','Least corrupt (CPI 70+)':'Least corrupt','Most corrupt (CPI under 25)':'Most corrupt','CO₂ over 10 t per person':'CO₂ 10t+ per person','Has nuclear power plants':'Nuclear power',
  'Population over 50 million':'50M+ people','Population under 1 million':'Under 1M people','Population under 100,000':'Under 100K people','Area over 2 million km\u00B2':'Over 2M km\u00B2','Area under 1,000 km\u00B2':'Under 1,000 km\u00B2','Exactly 2 land neighbours':'2 neigh\u00ADbours','3 or 4 land neighbours':'3\u20134 neigh\u00ADbours','Capital starts with B':'Capital: B\u2026','Capital starts with M':'Capital: M\u2026','Capital starts with P':'Capital: P\u2026','Capital starts with S':'Capital: S\u2026','Capital over 1 million people':'Capital 1M+ people','Capital under 100,000 people':'Capital under 100K','Capital is not the largest city':'Capital not largest city',
  'Landlocked':'Land\u00ADlocked','Has 5+ land neighbours':'5+ neigh\u00ADbours','Exactly 1 land neighbour':'Only 1 neigh\u00ADbour','In North or Central America':'In N. & Central America','Island nation (no land borders)':'Island nation','Centre south of the Equator':'South of the Equator','Centre in the tropics':'In the tropics','Centre north of 45°N':'North of 45°N','Area over 1 million km²':'Over 1M km²','Area under 30,000 km²':'Under 30,000 km²','Population over 100 million':'100M+ people','Name has 5 letters or fewer':'Name ≤ 5 letters','Name has 10+ letters':'Name 10+ letters','Starts and ends with the same letter':'Same first & last letter','Currency called "dollar"':'Uses a dollar','Capital starts with same letter':'Capital, same initial','Capital name has 2+ words':'2-word capital'};
Object.assign(SHORT,SHORT0);
CATS.forEach(k=>{k.desc=describe(k);k.short=SHORT[k.label]||k.label.replace(/^Official language: /,'Official: ')});

/* ---- seeded rng + generator ---- */
function rngFrom(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuffle(arr,r){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const inter=(a,b)=>{const o=[];for(let i=0;i<C.length;i++)if(a.set[i]&&b.set[i])o.push(i);return o};

// time in Spain: every daily game changes at midnight CET
const madrid=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function madridParts(t){const o={};madrid.formatToParts(new Date(t)).forEach(p=>o[p.type]=p.value);return o}
