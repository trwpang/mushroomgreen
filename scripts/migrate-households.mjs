// scripts/migrate-households.mjs
// One-shot migration: legacy inline JS -> 59 src/content/households/*.md files.
// Source: legacy/Map/mushroom_green_1865_v10_9_3.html (`census` object lines
// 71-131; `osmHouses` array line 133). Both literals are pasted verbatim below
// to avoid runtime HTML parsing.
//
// Safe to re-run; overwrites existing files.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'src', 'content', 'households');
mkdirSync(OUT_DIR, { recursive: true });

// ===== census =====
// Verbatim from legacy HTML lines 72-132.
const census = {
  1: {name:"Frost",                        occ:2,  weaver:false, founder:false},
  2: {name:"Roberts",                      occ:5,  weaver:false, founder:false},
  3: {name:"Coley",                         occ:3,  weaver:false, founder:false},
  4: {name:"Heath",                         occ:6,  weaver:false, founder:false},
  5: {name:"Coley",                        occ:3,  weaver:false, est:false},
  6: {name:"Henry Weaver 1827",            occ:6,  weaver:true,  est:false},
  7: {name:"Kendrick",                     occ:4,  weaver:false, est:false},
  8: {name:"Peakes",                       occ:3,  weaver:false, est:false},
  9: {name:"Kendrick",                     occ:8,  weaver:false, est:false},
  10:{name:"Benj Billingham",              occ:10, weaver:false, est:false},
  11:{name:"Susannah Round",               occ:1,  weaver:false, est:false},
  12:{name:"Kendrick",                     occ:7,  weaver:false, est:false},
  13:{name:"Pearson",                      occ:9,  weaver:false, est:false},
  14:{name:"Dimmock",                      occ:3,  weaver:false, est:false},
  15:{name:"Yardley",                      occ:7,  weaver:false, est:false},
  16:{name:"Jos Dimmock 1830",             occ:3,  weaver:false, est:false},
  17:{name:"Billingham",                   occ:5,  weaver:false, est:false},
  18:{name:"Stanton",                      occ:3,  weaver:false, est:false},
  19:{name:"Foley",                        occ:8,  weaver:false, est:false},
  20:{name:"Jos. Weaver 1811",             occ:10, weaver:true,  est:false},
  21:{name:"Amb Weaver 1814",              occ:7,  weaver:true,  est:false},
  22:{name:"Henry Weaver 1789",            occ:2,  weaver:true,  est:false, founder:true},
  23:{name:"Bradley",                      occ:3,  weaver:false, est:false},
  24:{name:"Jas Weaver 1814",              occ:8,  weaver:true,  est:false},
  25:{name:"Thos Weaver 1821",             occ:9,  weaver:true,  est:false},
  26:{name:"Hannah Weaver (Tromans) 1813", occ:3,  weaver:true,  est:false},
  27:{name:"Hancox",                       occ:4,  weaver:false, est:false},
  28:{name:"John Homer 1819",              occ:7,  weaver:false, est:false},
  29:{name:"Dimmock",                      occ:6,  weaver:false, est:false},
  30:{name:"Pearson",                      occ:6,  weaver:false, est:false},
  31:{name:"Raybould",                     occ:3,  weaver:false, est:false},
  32:{name:"Griffiths",                    occ:5,  weaver:false, est:false},
  33:{name:"Marsh",                        occ:6,  weaver:false, est:false},
  34:{name:"Pearson",                      occ:2,  weaver:false, est:false},
  35:{name:"John Homer 1803",              occ:4,  weaver:false, est:false},
  36:{name:"Henry Weaver 1837",            occ:4,  weaver:true,  est:false},
  37:{name:"Samuel Weaver 1818",           occ:8,  weaver:true,  est:false},
  38:{name:"Yardley / Mariah Weaver 1789", occ:15, weaver:true,  est:false},
  39:{name:"Billingham",                   occ:13, weaver:false, est:false},
  40:{name:"Dimmock",                      occ:5,  weaver:false, est:false},
  41:{name:"Heathcock",                    occ:1,  weaver:false, est:false},
  42:{name:"Geo Billingham 1793",          occ:6,  weaver:false, est:false},
  43:{name:"John Billingham 1823",         occ:7,  weaver:false, est:false},
  44:{name:"Homer",                        occ:2,  weaver:false, est:false},
  45:{name:"Round",                        occ:9,  weaver:false, est:false},
  46:{name:"Sidaway",                      occ:6,  weaver:false, est:false},
  47:{name:"Hancox",                       occ:4,  weaver:false, est:false},
  48:{name:"Pearson",                      occ:6,  weaver:false, est:false},
  49:{name:"Homer",                        occ:7,  weaver:false, est:false},
  50:{name:"Cox",                          occ:2,  weaver:false, est:false},
  51:{name:"Wm Round / Isaac Billingham",  occ:5,  weaver:false, est:false},
  52:{name:"Thos Homer 1803",              occ:6,  weaver:false, est:false},
  53:{name:"Hannah Nicklin 1897",          occ:8,  weaver:false, est:false},
  54:{name:"Coates",                       occ:5,  weaver:false, est:false},
  55:{name:"Pearson",                      occ:4,  weaver:false, est:false},
  56:{name:"Hancox",                       occ:7,  weaver:false, est:false},
  57:{name:"Hancox",                       occ:5,  weaver:false, est:false},
  58:{name:"Kendrick / Dimmock",           occ:5,  weaver:false, est:false},
  59:{name:"Sml Billingham 1826",          occ:9,  weaver:false, est:false},
};

// ===== osmHouses =====
// Verbatim from legacy HTML line 134.
const osmHouses = [{"number": "1", "num_int": 1, "lat": 52.47561399999999, "lon": -2.09250598, "poly": [[52.4756481, -2.0925223], [52.4756037, -2.0925748], [52.4755628, -2.0924815], [52.4756073, -2.092429], [52.4756481, -2.0925223]]}, {"number": "2", "num_int": 2, "lat": 52.47554792, "lon": -2.0926017000000003, "poly": [[52.475549, -2.0926668], [52.4754998, -2.0925642], [52.4755463, -2.0925041], [52.4755955, -2.0926066], [52.475549, -2.0926668]]}, {"number": "3", "num_int": 3, "lat": 52.47547614, "lon": -2.09269694, "poly": [[52.4754787, -2.0927655], [52.4754248, -2.0926585], [52.4754723, -2.0925941], [52.4755262, -2.0927011], [52.4754787, -2.0927655]]}, {"number": "4", "num_int": 4, "lat": 52.475393540000006, "lon": -2.0928089400000003, "poly": [[52.475451, -2.0928132], [52.475374, -2.0929156], [52.475305, -2.0927998], [52.4753867, -2.0927029], [52.475451, -2.0928132]]}, {"number": "5", "num_int": 5, "lat": 52.47539714, "lon": -2.09319796, "poly": [[52.475383, -2.0932648], [52.4754544, -2.0931739], [52.4754183, -2.0930977], [52.475347, -2.0931886], [52.475383, -2.0932648]]}, {"number": "6", "num_int": 6, "lat": 52.47524248, "lon": -2.09314788, "poly": [[52.4752645, -2.0932245], [52.4752946, -2.0931014], [52.4752091, -2.0930405], [52.4751797, -2.0931485], [52.4752645, -2.0932245]]}, {"number": "7", "num_int": 7, "lat": 52.47513074444444, "lon": -2.093264544444444, "poly": [[52.4751646, -2.0933165], [52.47516, -2.0932577], [52.4751896, -2.0932515], [52.4751837, -2.0931764], [52.4750879, -2.0931965], [52.475093, -2.0932616], [52.475064, -2.0932677], [52.4750693, -2.0933365], [52.4751646, -2.0933165]]}, {"number": "8", "num_int": 8, "lat": 52.47512648181819, "lon": -2.093535727272727, "poly": [[52.4750738, -2.0935247], [52.4750742, -2.0935416], [52.4750853, -2.0935683], [52.4750974, -2.0935781], [52.4751237, -2.0935467], [52.4751659, -2.0936424], [52.4752239, -2.0935734], [52.4751753, -2.0934634], [52.4751576, -2.0934844], [52.4751404, -2.0934453], [52.4750738, -2.0935247]]}, {"number": "9", "num_int": 9, "lat": 52.4753194, "lon": -2.0937533166666666, "poly": [[52.4753541, -2.0937977], [52.4753594, -2.0936776], [52.4752747, -2.0936675], [52.4752694, -2.0937876], [52.4753047, -2.0937918], [52.4753541, -2.0937977]]}, {"number": "10", "num_int": 10, "lat": 52.47549647999999, "lon": -2.09383648, "poly": [[52.4755493, -2.0938479], [52.4754987, -2.0937274], [52.4754173, -2.0938193], [52.4754678, -2.0939399], [52.4755493, -2.0938479]]}, {"number": "11", "num_int": 11, "lat": 52.475637750000004, "lon": -2.0940102666666665, "poly": [[52.4756393, -2.094073], [52.4756878, -2.0940225], [52.4756445, -2.0939103], [52.475596, -2.0939608], [52.4756196, -2.094022], [52.4756393, -2.094073]]}, {"number": "12", "num_int": 12, "lat": 52.4756298, "lon": -2.09370652, "poly": [[52.4756276, -2.0937826], [52.475683, -2.0937274], [52.4756331, -2.0935924], [52.4755777, -2.0936476], [52.4756276, -2.0937826]]}, {"number": "13", "num_int": 13, "lat": 52.47576268, "lon": -2.09385978, "poly": [[52.4757548, -2.0939303], [52.4758113, -2.0938886], [52.4757745, -2.093754], [52.475718, -2.0937957], [52.4757548, -2.0939303]]}, {"number": "14", "num_int": 14, "lat": 52.47556278, "lon": -2.09310114, "poly": [[52.4756062, -2.0931079], [52.4755769, -2.0930199], [52.4754977, -2.093091], [52.4755269, -2.093179], [52.4756062, -2.0931079]]}, {"number": "15", "num_int": 15, "lat": 52.47574882, "lon": -2.09259886, "poly": [[52.4758005, -2.0926225], [52.4757645, -2.0924933], [52.4756713, -2.0925634], [52.4757073, -2.0926926], [52.4758005, -2.0926225]]}, {"number": "16", "num_int": 16, "lat": 52.47586249999999, "lon": -2.0923603999999996, "poly": [[52.4759083, -2.0924183], [52.4759096, -2.0922764], [52.4757938, -2.0922735], [52.4757925, -2.0924155], [52.4759083, -2.0924183]]}, {"number": "17", "num_int": 17, "lat": 52.47596188, "lon": -2.0925003, "poly": [[52.4759932, -2.0925517], [52.4759938, -2.0924242], [52.4759149, -2.0924232], [52.4759143, -2.0925507], [52.4759932, -2.0925517]]}, {"number": "18", "num_int": 18, "lat": 52.4758062, "lon": -2.092823185714286, "poly": [[52.4758462, -2.0929095], [52.4758542, -2.0927019], [52.475813, -2.0926976], [52.475808, -2.0928264], [52.4757394, -2.0928193], [52.4757364, -2.0928981], [52.4758462, -2.0929095]]}, {"number": "19", "num_int": 19, "lat": 52.4757263, "lon": -2.0932024599999997, "poly": [[52.4757375, -2.0933289], [52.4757707, -2.0930312], [52.4757095, -2.0930128], [52.4756763, -2.0933105], [52.4757375, -2.0933289]]}, {"number": "20", "num_int": 20, "lat": 52.47629171999999, "lon": -2.0933161399999998, "poly": [[52.4762972, -2.0932293], [52.4762564, -2.0932441], [52.4762835, -2.0934464], [52.4763243, -2.0934316], [52.4762972, -2.0932293]]}, {"number": "21", "num_int": 21, "lat": 52.475866475000004, "lon": -2.0935166875, "poly": [[52.4758716, -2.0934695], [52.4758924, -2.093464], [52.4758979, -2.09352], [52.4758793, -2.093525], [52.4758859, -2.0935915], [52.4758226, -2.0936083], [52.4758105, -2.0934857], [52.4758716, -2.0934695]]}, {"number": "22", "num_int": 22, "lat": 52.47575918, "lon": -2.09357062, "poly": [[52.4758041, -2.0936096], [52.4757662, -2.0934586], [52.4756894, -2.0935066], [52.4757321, -2.0936687], [52.4758041, -2.0936096]]}, {"number": "23", "num_int": 23, "lat": 52.476116579999996, "lon": -2.0926614199999998, "poly": [[52.4760164, -2.0926195], [52.4760165, -2.0927255], [52.4762669, -2.0927243], [52.4762667, -2.0926183], [52.4760164, -2.0926195]]}, {"number": "24", "num_int": 24, "lat": 52.47605598571429, "lon": -2.0933058, "poly": [[52.4760977, -2.0933883], [52.4761207, -2.0932549], [52.4760625, -2.0932279], [52.4760518, -2.0932901], [52.4759869, -2.0932599], [52.4759746, -2.0933312], [52.4760977, -2.0933883]]}, {"number": "25", "num_int": 25, "lat": 52.47621212222222, "lon": -2.093346811111111, "poly": [[52.4762683, -2.0933966], [52.4762487, -2.0932425], [52.4762001, -2.0932591], [52.4762047, -2.0932952], [52.4761352, -2.093319], [52.476147, -2.0934115], [52.4762168, -2.0933876], [52.47622, -2.0934132], [52.4762683, -2.0933966]]}, {"number": "26", "num_int": 26, "lat": 52.475905620000006, "lon": -2.09378184, "poly": [[52.4759459, -2.0938422], [52.4759222, -2.0936637], [52.4758452, -2.0936913], [52.4758689, -2.0938698], [52.4759459, -2.0938422]]}, {"number": "27", "num_int": 27, "lat": 52.47602278000001, "lon": -2.0936635, "poly": [[52.4760294, -2.0936106], [52.4760543, -2.0937165], [52.4760129, -2.0937429], [52.4759879, -2.0936369], [52.4760294, -2.0936106]]}, {"number": "28", "num_int": 28, "lat": 52.47613068, "lon": -2.09366122, "poly": [[52.4761598, -2.0936897], [52.4761417, -2.0935914], [52.476087, -2.0936185], [52.4761051, -2.0937168], [52.4761598, -2.0936897]]}, {"number": "29", "num_int": 29, "lat": 52.476218599999996, "lon": -2.0930093800000003, "poly": [[52.4762456, -2.0930593], [52.4762579, -2.0929616], [52.4761781, -2.0929345], [52.4761658, -2.0930322], [52.4762456, -2.0930593]]}, {"number": "30", "num_int": 30, "lat": 52.476028, "lon": -2.09297948, "poly": [[52.4760406, -2.0930696], [52.4760715, -2.0928704], [52.4760091, -2.0928443], [52.4759782, -2.0930435], [52.4760406, -2.0930696]]}, {"number": "31", "num_int": 31, "lat": 52.4762377, "lon": -2.0927900399999997, "poly": [[52.4762638, -2.0927982], [52.4762511, -2.0927444], [52.4761986, -2.0927778], [52.4762112, -2.0928316], [52.4762638, -2.0927982]]}, {"number": "32", "num_int": 32, "lat": 52.47628846, "lon": -2.09283906, "poly": [[52.4763101, -2.0928516], [52.476266, -2.0928738], [52.476256, -2.0928203], [52.4763001, -2.092798], [52.4763101, -2.0928516]]}, {"number": "33", "num_int": 33, "lat": 52.47630936, "lon": -2.09294414, "poly": [[52.4763372, -2.0929703], [52.476319, -2.0928777], [52.4762676, -2.0929049], [52.4762858, -2.0929975], [52.4763372, -2.0929703]]}, {"number": "34", "num_int": 34, "lat": 52.476327160000004, "lon": -2.09303314, "poly": [[52.4763558, -2.0930461], [52.4763421, -2.092981], [52.4762842, -2.0930137], [52.4762979, -2.0930788], [52.4763558, -2.0930461]]}, {"number": "35", "num_int": 35, "lat": 52.47633946, "lon": -2.09311576, "poly": [[52.4763656, -2.093126], [52.4763543, -2.0930706], [52.4763002, -2.0931004], [52.4763116, -2.0931558], [52.4763656, -2.093126]]}, {"number": "36", "num_int": 36, "lat": 52.47634342, "lon": -2.09318636, "poly": [[52.4763157, -2.093172], [52.4763246, -2.093232], [52.476385, -2.0932079], [52.4763761, -2.0931479], [52.4763157, -2.093172]]}, {"number": "37", "num_int": 37, "lat": 52.47636688, "lon": -2.09327264, "poly": [[52.4763963, -2.0932888], [52.4763862, -2.0932224], [52.4763232, -2.0932483], [52.4763324, -2.0933149], [52.4763963, -2.0932888]]}, {"number": "38", "num_int": 38, "lat": 52.476365539999996, "lon": -2.09336698, "poly": [[52.4763471, -2.0934041], [52.4763384, -2.0933282], [52.4763932, -2.0933113], [52.4764019, -2.0933872], [52.4763471, -2.0934041]]}, {"number": "39", "num_int": 39, "lat": 52.47638088, "lon": -2.09357958, "poly": [[52.4764085, -2.093604], [52.476399, -2.093524], [52.4763395, -2.0935429], [52.4763489, -2.093623], [52.4764085, -2.093604]]}, {"number": "40", "num_int": 40, "lat": 52.47636532, "lon": -2.09378558, "poly": [[52.4763832, -2.0938299], [52.4763951, -2.0937391], [52.4763475, -2.0937223], [52.4763176, -2.0938067], [52.4763832, -2.0938299]]}, {"number": "41", "num_int": 41, "lat": 52.476345779999996, "lon": -2.09394338, "poly": [[52.4763684, -2.0939966], [52.4763853, -2.0938971], [52.4763146, -2.0938651], [52.4762922, -2.0939615], [52.4763684, -2.0939966]]}, {"number": "42", "num_int": 42, "lat": 52.47629872, "lon": -2.0940845599999998, "poly": [[52.4763106, -2.0941375], [52.4763412, -2.0940523], [52.476283, -2.0940081], [52.4762482, -2.0940874], [52.4763106, -2.0941375]]}, {"number": "43", "num_int": 43, "lat": 52.47625268, "lon": -2.09420718, "poly": [[52.476263, -2.0942622], [52.4762966, -2.0941737], [52.4762393, -2.0941218], [52.4762015, -2.094216], [52.476263, -2.0942622]]}, {"number": "44", "num_int": 44, "lat": 52.47660701428571, "lon": -2.0934417714285716, "poly": [[52.4766054, -2.093563], [52.4766207, -2.0933935], [52.4766462, -2.0933997], [52.4766532, -2.0933221], [52.4765702, -2.093302], [52.476548, -2.0935491], [52.4766054, -2.093563]]}, {"number": "45", "num_int": 45, "lat": 52.47659042, "lon": -2.09437164, "poly": [[52.4766099, -2.0944256], [52.4766325, -2.0943441], [52.4765612, -2.0942907], [52.4765386, -2.0943722], [52.4766099, -2.0944256]]}, {"number": "46", "num_int": 46, "lat": 52.476556540000004, "lon": -2.0944850600000002, "poly": [[52.4765737, -2.0945383], [52.4765974, -2.0944588], [52.4765308, -2.0944052], [52.4765071, -2.0944847], [52.4765737, -2.0945383]]}, {"number": "47", "num_int": 47, "lat": 52.47652178, "lon": -2.09461266, "poly": [[52.4765391, -2.0946759], [52.4765635, -2.0945546], [52.4764958, -2.0945178], [52.4764714, -2.0946391], [52.4765391, -2.0946759]]}, {"number": "48", "num_int": 48, "lat": 52.4764048, "lon": -2.0944850571428573, "poly": [[52.4764188, -2.0945959], [52.4764547, -2.094479], [52.4764091, -2.0944412], [52.4764224, -2.0943981], [52.4763795, -2.0943626], [52.4763303, -2.0945227], [52.4764188, -2.0945959]]}, {"number": "49", "num_int": 49, "lat": 52.47642404, "lon": -2.09430094, "poly": [[52.4764366, -2.0943553], [52.4764571, -2.0942456], [52.4764052, -2.0942194], [52.4763847, -2.0943291], [52.4764366, -2.0943553]]}, {"number": "50", "num_int": 50, "lat": 52.476460880000005, "lon": -2.09410976, "poly": [[52.476474, -2.0941499], [52.476487, -2.0940696], [52.4764412, -2.0940495], [52.4764282, -2.0941299], [52.476474, -2.0941499]]}, {"number": "51", "num_int": 51, "lat": 52.476527839999996, "lon": -2.09389638, "poly": [[52.476526, -2.0939639], [52.4765756, -2.0938463], [52.4765306, -2.0937951], [52.476481, -2.0939127], [52.476526, -2.0939639]]}, {"number": "52", "num_int": 52, "lat": 52.47657834, "lon": -2.09397292, "poly": [[52.4765369, -2.0940066], [52.4765962, -2.0938714], [52.4766399, -2.0939185], [52.4765818, -2.0940615], [52.4765369, -2.0940066]]}, {"number": "53", "num_int": 53, "lat": 52.47669456, "lon": -2.0939711599999997, "poly": [[52.4767242, -2.0939172], [52.4767196, -2.0940582], [52.4766501, -2.0940521], [52.4766547, -2.0939111], [52.4767242, -2.0939172]]}, {"number": "54", "num_int": 54, "lat": 52.47679525555556, "lon": -2.0940702333333334, "poly": [[52.4767975, -2.0941352], [52.4768404, -2.0940608], [52.4768074, -2.0940122], [52.476816, -2.0939966], [52.4767967, -2.0939681], [52.4767377, -2.0940759], [52.4767768, -2.0941336], [52.4767873, -2.0941145], [52.4767975, -2.0941352]]}, {"number": "55", "num_int": 55, "lat": 52.476828985714285, "lon": -2.0944661, "poly": [[52.4768377, -2.0945587], [52.4768811, -2.0943547], [52.4768242, -2.094322], [52.4767955, -2.0944568], [52.4768207, -2.0944713], [52.476806, -2.0945405], [52.4768377, -2.0945587]]}, {"number": "56", "num_int": 56, "lat": 52.47669140000001, "lon": -2.09426144, "poly": [[52.476685, -2.0943539], [52.4767524, -2.0941749], [52.476701, -2.0941227], [52.4766336, -2.0943018], [52.476685, -2.0943539]]}, {"number": "57", "num_int": 57, "lat": 52.47679534, "lon": -2.09422166, "poly": [[52.4767939, -2.0942793], [52.4768296, -2.0941613], [52.4767975, -2.0941352], [52.4767618, -2.0942532], [52.4767939, -2.0942793]]}, {"number": "58", "num_int": 58, "lat": 52.4766434, "lon": -2.09371818, "poly": [[52.4766626, -2.0937895], [52.4766974, -2.0937141], [52.4766146, -2.0936112], [52.4765798, -2.0936866], [52.4766626, -2.0937895]]}, {"number": "59", "num_int": 59, "lat": 52.476780180000006, "lon": -2.09374038, "poly": [[52.4768218, -2.0937448], [52.4768046, -2.0936706], [52.4767167, -2.0937345], [52.476736, -2.0938072], [52.4768218, -2.0937448]]}];

// ===== family detection =====
// Iteration order matches the legacy HTML's substring-match logic so families
// resolve identically. Weaver flag wins outright; otherwise first substring hit.
const FAMILIES = ['Weaver','Billingham','Hancox','Dimmock','Griffiths','Nicklin','Pearson','Sidaway','Kendrick'];

function detectFamily(entry) {
  if (entry.weaver) return 'Weaver';
  const lc = entry.name.toLowerCase();
  for (const fam of FAMILIES) {
    if (lc.includes(fam.toLowerCase())) return fam;
  }
  return 'Other';
}

// ===== slug =====
// Mirror of src/lib/slug.ts. Kept in lockstep manually (one-shot script).
const SECONDARY_FIRST_NAMES = new Set(['mariah', 'isaac']);
const ALWAYS_DROP = new Set(['wm']);

function tokenize(s) {
  return s
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((tok) => tok.length > 0);
}

function nameSlug(raw) {
  let s = raw.toLowerCase();
  s = s.replace(/[()]/g, ' ');
  const parts = s.split('/').map((p) => p.trim());
  const cleanedParts = parts.map((part, idx) => {
    const tokens = tokenize(part);
    return tokens
      .filter((tok) => !ALWAYS_DROP.has(tok))
      .filter((tok) => !(idx > 0 && SECONDARY_FIRST_NAMES.has(tok)))
      .join('-');
  });
  return cleanedParts.filter((p) => p.length > 0).join('-');
}

function slugify(number, householdName) {
  const numPart = String(number).padStart(2, '0');
  return `${numPart}-${nameSlug(householdName)}`;
}

// ===== YAML emit =====
function escapeYamlString(s) {
  // Backslash-escape backslashes and double-quotes for a double-quoted scalar.
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function yamlFrontmatter(n, entry, house) {
  const family = detectFamily(entry);
  const lines = [];
  lines.push('---');
  lines.push(`number: ${n}`);
  lines.push(`household_name: "${escapeYamlString(entry.name)}"`);
  lines.push(`family: ${family}`);
  if (entry.founder) lines.push(`founder: true`);
  if (entry.est) lines.push(`estimated_position: true`);
  lines.push(`occupants_1861: ${entry.occ}`);
  lines.push(`position:`);
  lines.push(`  lat: ${house.lat}`);
  lines.push(`  lon: ${house.lon}`);
  lines.push(`polygon:`);
  for (const [lat, lon] of house.poly) {
    lines.push(`  - [${lat}, ${lon}]`);
  }
  lines.push(`sources:`);
  lines.push(`  - "1861 census"`);
  lines.push(`  - "OSM building polygon (mapping by Mike Mushroom)"`);
  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

// ===== run =====
const housesByNumber = new Map(osmHouses.map((h) => [h.num_int, h]));
let written = 0;
const warnings = [];

for (let n = 1; n <= 59; n++) {
  const entry = census[n];
  const house = housesByNumber.get(n);
  if (!entry) { warnings.push(`#${n}: missing census entry`); continue; }
  if (!house) { warnings.push(`#${n}: missing osmHouses entry`); continue; }
  const slug = slugify(n, entry.name);
  const filePath = join(OUT_DIR, `${slug}.md`);
  writeFileSync(filePath, yamlFrontmatter(n, entry, house), 'utf8');
  written += 1;
}

console.log(`Wrote ${written} household files`);
for (const w of warnings) console.warn(`WARN ${w}`);
