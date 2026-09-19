/** Original interpretive models. Sources and visual observations: docs/village/interior-objects.md. */
export const interiorCatalogue = [
 ['open-range','Open grate cooking range','core'],['oven-range','Side-oven kitchen range','core'],['hob-stove','Compact enclosed hob stove','core'],
 ['scrubbed-table','Scrubbed plank dining table','core'],['turned-table','Turned-leg kitchen table','core'],['trestle-table','Braced trestle dining table','core'],
 ['rope-bed','Rope-strung timber bed','core'],['iron-bed','Hoop-ended iron bed','core'],['box-bed','Boarded box bed','core'],
 ['dresser','Kitchen dresser with plate shelves','core'],['drawers','Kitchen chest of drawers','core'],['food-cupboard','Ventilated food cupboard','core'],
 ['spindle-chair','Spindle-back chair','core'],['ladder-chair','Ladder-back chair','core'],['bench','Plain settle bench','core'],['stool','Splayed four-leg stool','core'],
 ['cradle','Rocking wooden cradle','floor'],['blanket-box','Iron-strapped blanket box','core'],['washstand','Basin washstand','core'],['plate-rack','Wall plate rack','wall'],
 ['cooking-pot','Bail-handled iron cooking pot','hearth'],['saucepan','Lidded saucepan','hearth'],['iron-kettle','Iron hob kettle','hearth'],['copper-kettle','Copper kettle','hearth'],
 ['griddle','Handled flat griddle','hearth'],['skillet','Long-handled skillet','hearth'],['toast-fork','Long toasting fork','wall'],['poker','Loop-ended fire poker','wall'],['tongs','Fire tongs','wall'],['coal-shovel','Small coal shovel','wall'],
 ['coal-scuttle','Open coal scuttle with coal','floor'],['water-pail','Hooped wooden water pail','floor'],['slop-pail','Lidded domestic slop pail','floor'],['fireguard','Three-sided iron fireguard','hearth'],['bellows','Leather and timber bellows','wall'],
 ['flat-iron','Solid flat iron','shelf'],['trivet','Three-foot iron trivet','hearth'],['candlestick','Brass chamber candlestick','surface'],['oil-lamp','Glass-chimney oil lamp','surface'],['tinderbox','Tin tinderbox','shelf'],
 ['dinner-plate','Blue-banded dinner plate','surface'],['side-plate','Scalloped side plate','surface'],['soup-bowl','Slip-banded soup bowl','surface'],['mixing-bowl','Earthenware mixing bowl','surface'],['jug','Brown salt-glazed jug','surface'],
 ['teapot','Brown pottery teapot','surface'],['teacup','Blue-banded teacup','surface'],['saucer','Ringed saucer','surface'],['tankard','Pewter tankard','surface'],['egg-cup','Turned wooden egg cup','surface'],
 ['bread','Scored cottage loaf','surface'],['bread-board','Handled bread board','surface'],['rolling-pin','Turned rolling pin','surface'],['wooden-spoon','Carved wooden spoon','surface'],['ladle','Deep iron ladle','wall'],
 ['knife','Wood-handled kitchen knife','surface'],['fork','Two-tined eating fork','surface'],['salt-cellar','Wooden salt cellar','surface'],['spice-jar','Small stoppered spice jar','shelf'],['storage-crock','Lidded stoneware storage crock','shelf'],
 ['stone-bottle','Stoneware bottle with cork','shelf'],['glass-bottle','Dark green glass bottle','shelf'],['bread-crock','Large covered bread crock','shelf'],['butter-dish','Covered butter dish','surface'],['cheese','Cut cheese wedge','surface'],
 ['flour-sack','Tied flour sack','floor'],['onion-string','Hanging string of onions','wall'],['herb-bundle','Hanging dried herbs','wall'],['coffee-mill','Hand coffee mill','shelf'],['mortar','Mortar and pestle','surface'],
 ['hand-machine','Hand-cranked sewing machine','surface'],['treadle-machine','Treadle sewing machine','core'],['sewing-basket','Woven sewing basket','surface'],['thread-spools','Three thread spools','surface'],['scissors','Tailor’s shears','surface'],
 ['pincushion','Pins in a cloth cushion','surface'],['darning-mushroom','Wooden darning mushroom','surface'],['needle-case','Sliding needle case','surface'],['folded-linen','Stack of folded linen','shelf'],['patchwork-quilt','Pieced patchwork quilt','bed'],
 ['pillow','Ticking pillow','bed'],['bolster','Rolled bolster','bed'],['chamber-pot','Handled chamber pot','floor'],['boots','Laced leather work boots','floor'],['clogs','Wood-soled leather clogs','floor'],
 ['cap','Soft working cap','shelf'],['apron','Hanging working apron','wall'],['towel','Hanging woven towel','wall'],['curtains','Gathered curtain pair and rod','wall'],['rag-rug','Striped rag rug','floor'],
 ['mirror','Small timber-framed mirror','wall'],['wall-clock','Wooden pendulum wall clock','wall'],['framed-print','Small framed landscape print','wall'],['book','Cloth-bound household book','shelf'],['candle-snuffer','Conical candle snuffer','shelf'],
 ['scrub-brush','Wooden scrubbing brush','shelf'],['soap-dish','Soap on a pottery dish','surface'],['quarry-tiles','Worn quarry-tile floor kit','finish'],['flagstones','Uneven flagstone floor kit','finish'],['board-ceiling','Narrow wooden ceiling kit','finish'],
 ['windsor-armchair','Hoop-back wooden armchair','core'],['rush-armchair','Rush-seat ladder armchair','core'],
 ['prep-table','Scrubbed kitchen preparation bench','core'],['sewing-table','Small sewing work table','core'],
 ['water-crock-stand','Water crock on timber stand','core'],['log-basket','Kindling in a wicker basket','floor'],
 ['pan-rack','Peg rack with copper and iron pans','wall'],['wall-sampler','Framed stitched household sampler','wall'],
 ['oval-portrait','Small oval framed silhouette','wall'],['mantel-clock','Plain wooden mantel clock','surface'],
 ['vegetable-basket','Basket of potatoes and onions','shelf'],['dish-rack','Wooden drainer with plates','surface'],
] as const;
export type InteriorObjectId=typeof interiorCatalogue[number][0];
export type ObjectSupport=typeof interiorCatalogue[number][2];
export const interiorNames=Object.fromEntries(interiorCatalogue.map(([id,name])=>[id,name])) as Record<InteriorObjectId,string>;
