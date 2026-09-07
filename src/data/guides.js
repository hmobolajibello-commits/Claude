"use strict";
/* Guide bodies. Plain HTML strings so the static site generator can drop them
   straight into a page; interactive bits are empty <div id="…"> hooks that
   assets/tools.js fills in on the client. Internal links use the wiki's
   #/e/<id> · #/c/<cat> · #/g/<id> · #/t/<id> scheme and are rewritten into real
   paths at build time.                                                        */

module.exports = {

beginner: {n:"Beginner&#8217;s guide",
 lede:"Fisch drops you on a dock with a Flimsy Rod, no bait and no money, and explains almost none of itself. This is the first hour: how the three-part minigame actually works, what to buy, what to ignore, and where to go once you can leave.",
 html:`
<h2 class="sh">1. The minigame is three checks, not one</h2>
<div class="prose"><p>Almost everything a new player loses is lost in the middle step.</p>
<ul><li><strong>Cast.</strong> Equip the rod, hold the mouse button to fill the power meter, release. Distance matters &mdash; some species do not live where a short cast lands.</li>
<li><strong>Shake.</strong> Prompts appear over the line; click them fast. <strong>Missing one restarts the cast.</strong> This is the biggest time sink in the early game, and exactly what the <a href="#/e/steady-rod">Steady Rod</a>&#8217;s wider shake window fixes.</li>
<li><strong>Reel.</strong> A bar with a fish marker inside it. <strong>Hold</strong> to slide right, <strong>release</strong> to drift left. Tap in small corrections rather than gripping the button &mdash; overshoot is what loses the fish.</li></ul></div>

<h2 class="sh">2. The first hour, in order</h2>
<div class="prose"><ol>
<li>Talk to <a href="#/e/pierre">Pierre</a> on the Moosewood beach and finish the tutorial. He sells nothing; he is onboarding.</li>
<li>Fish the dock. Sell everything to the Merchant in the village centre &mdash; yes, including the trash.</li>
<li>At <strong>400 C$</strong>, buy the <a href="#/e/rowboat">Rowboat</a> from the Shipwright at the docks.</li>
<li>At <strong>2,000 C$</strong>, buy the <a href="#/e/carbon-rod">Carbon Rod</a> from Marc. This is your first real purchase. Skip the 300 C$ Training Rod and the 900 C$ Plastic Rod entirely.</li>
<li>Fill the Moosewood <a href="#/e/bestiary">bestiary</a> before you sail. It is free percentage toward the 70% that unlocks a 190,000 C$ rod later.</li>
<li>Sail to <a href="#/e/roslit-bay">Roslit Bay</a>, then <a href="#/e/mushgrove-swamp">Mushgrove Swamp</a>. Catch one Alligator and <a href="#/e/agaric">Agaric</a> gives you the <a href="#/e/fungal-rod">Fungal Rod</a> free.</li></ol></div>

<h2 class="sh">3. The four stats, and what they are for</h2>
<div class="prose"><ul>
<li><strong><a href="#/e/lure-speed">Lure speed</a></strong> &mdash; how fast fish bite. Throughput. Best when you are farming money.</li>
<li><strong><a href="#/e/luck">Luck</a></strong> &mdash; and there are two kinds. <em>Universal</em> luck biases the whole rarity table; <em>preferred</em> luck boosts specific species. Stacking the wrong one is the most common gear mistake in Fisch.</li>
<li><strong><a href="#/e/control">Control</a></strong> &mdash; how precisely your bar tracks in the reel.</li>
<li><strong><a href="#/e/resilience">Resilience</a></strong> &mdash; how much error the line absorbs before you lose the fish.</li>
<li>And a hard limit: <strong><a href="#/e/max-weight">max weight</a></strong>. Over it you simply do not land the fish. &ldquo;Why can I never catch anything here&rdquo; is usually this.</li></ul></div>

<h2 class="sh">4. Things worth knowing on day one</h2>
<div class="prose"><ul>
<li><strong>Weather is buyable.</strong> A fish that only appears in fog is not a waiting game &mdash; it is a <a href="#/e/smokescreen-totem">Smokescreen Totem</a>.</li>
<li><strong>Enchanting costs 400 C$ to unlock,</strong> once, forever: bribe the guard by the mine elevator at the <a href="#/e/statue-of-sovereignty">Statue of Sovereignty</a>.</li>
<li><strong>Friends are +10% XP each,</strong> up to +50%. Free.</li>
<li><strong>Rods are not finished when you buy them</strong> &mdash; see <a href="#/e/rod-mastery">Rod Mastery</a>.</li>
<li><strong>Redeem the <a href="#/g/codes">codes</a></strong> before they expire. Event codes die with their event.</li></ul></div>

<h2 class="sh">5. Then what?</h2>
<div class="prose"><p>Put your level, rod and bank balance into the <a href="#/t/path">path planner</a> and it will give you the next five things to do in order, with what each one costs and where to earn it. Or read the <a href="#/g/progression">roadmap</a> end to end.</p></div>`},

mistakes: {n:"12 beginner mistakes",
 lede:"Ranked roughly by how much time each one costs. Most of them are not skill problems &mdash; they are ordering problems.",
 html:"MISTAKES_TABLE"},

"money-guide": {n:"Making money",
 lede:"What a fish is worth is its species&#8217; base value multiplied by weight, then by mutations and attributes. Every one of those is something you can raise on purpose &mdash; which is why two players at the same spot can earn ten times differently.",
 html:`
<h2 class="sh">The formula, and what you control</h2>
<div class="prose"><ul>
<li><strong>Base value &mdash; where you fish.</strong> The single biggest term. Moving location beats any gear change.</li>
<li><strong>Weight.</strong> Scales value directly. <a href="#/e/sea-overlord">Sea Overlord</a> adds a flat +25% to every fish you will ever catch.</li>
<li><strong>Mutations.</strong> Up to <b>12&times;</b> at the top. <a href="#/e/quantum">Quantum</a> manufactures them at 25%; the <a href="#/e/trident-rod">Trident Rod</a> at ~30%; the <a href="#/e/volcanic-rod">Volcanic Rod</a> at 20% for 5&times;; the <a href="#/e/ethereal-prism-rod">Ethereal Prism Rod</a> at <b>50% for 8&times;</b>.</li>
<li><strong>Attributes.</strong> Shiny and Sparkling stack on top of a mutation, and are safe to appraise around.</li>
<li><strong>Throughput.</strong> All the multipliers in the world do nothing while you are idle &mdash; which is why <a href="#/e/lure-speed">lure speed</a> is a money stat, and why the <a href="#/e/challengers-rod">Challenger&#8217;s Rod</a>&#8217;s +20% reel speed is a permanent raise.</li></ul></div>

<h2 class="sh">Farms by stage</h2>
MONEY_TABLE
<div class="goodbox"><strong>The one rule:</strong> a timed passive rewards lure speed and short fights; a luck-based one rewards luck stacking. Find out which kind your rod has before you pick a bait, because the two loadouts are opposites.</div>
<p class="note">Rates are community figures and swing hard on rod, bait, enchant and server conditions. Use them to rank spots, not to predict an evening.</p>`},

"xp-guide": {n:"XP &amp; levelling",
 lede:"Each level costs <b>190 &times; your current level</b>, so the curve is arithmetic rather than exponential for the first thousand levels &mdash; and still adds up to about 997 million XP for the 2,000 cap. Levelling in Fisch is a stacking problem, not a grinding problem.",
 html:`
<div id="xp-tool"></div>
<h2 class="sh">The stack</h2>
<div class="prose"><p>XP bonuses come from unrelated systems and multiply together, which is why a properly stacked catch can be worth tens of thousands of XP and an unstacked one a few hundred.</p>
<ul><li>An XP-flavoured rod and its mutations</li>
<li><a href="#/e/merlin">Merlin&#8217;s</a> temporary XP boost &mdash; <b>+20%</b></li>
<li><a href="#/e/shell-of-wrath">Shell of Wrath</a> &mdash; <b>+25%</b></li>
<li>A <a href="#/e/companions">companion</a> with an XP passive</li>
<li>Location and night multipliers &mdash; up to <b>3&times;</b> in specific spots</li>
<li>The <strong>Double XP</strong> gamepass</li>
<li><strong>+10% per friend</strong> in your party, up to <b>+50%</b></li></ul>
<p>The friend bonus is the one people leave on the table: five friends is +50% XP for nothing.</p></div>
<h2 class="sh">Why you would bother</h2>
<div class="prose"><p>Levels gate content, and the gates get steep. <a href="#/e/atlantis">Atlantis</a> wants around <b>180</b>. The <a href="#/e/fabulous-rod">Fabulous Rod</a> quest will not start below <b>1,000</b>. The <a href="#/e/olympian-godbreaker">Olympian Godbreaker</a> needs <b>981</b> and complete bestiaries on top. No amount of C$ substitutes for any of them.</p>
<p>If the <a href="#/t/path">planner</a> tells you your level is the blocker, this page is the fix.</p></div>`},

enchanting: {n:"Enchanting",
 lede:"The only way to make a rod better without buying a new one. You offer a relic at the <a href=\"#/e/keepers-altar\">Keepers Altar</a> and get a random enchant, which replaces whatever the rod had. It is a gamble, so treat it like one: farm the stack first, then spend it in one sitting.",
 html:`
<h2 class="sh">Unlocking the altar</h2>
<div class="prose"><ol>
<li>Sail to the <a href="#/e/statue-of-sovereignty">Statue of Sovereignty</a>.</li>
<li>Go into the mines and find the NPC beside the elevator.</li>
<li>Pay him <strong>400 C$</strong>. The elevator takes you down to the <a href="#/e/keepers-altar">Keepers Altar</a>.</li>
<li>Offer relics <span class="flag" title="Widely reported as night-only; a few write-ups omit the restriction">at night</span>.</li></ol>
<p>While you are down there, look left of the elevator: the <a href="#/e/kings-rod">King&#8217;s Rod</a> is sitting next to a skeleton.</p></div>

<h2 class="sh">Where relics come from</h2>
<div class="prose"><ul>
<li><strong><a href="#/e/ancient-isle">Ancient Isle</a></strong> &mdash; the best <a href="#/e/enchant-relic">Enchant Relic</a> farm players have compared head-to-head.</li>
<li><strong><a href="#/e/roslit-bay">Roslit Bay</a></strong>, in the Nurse Shark shallows &mdash; noticeably better than fishing at random, and reachable far earlier.</li>
<li><strong><a href="#/e/merlin">Merlin</a> on <a href="#/e/sunstone-island">Sunstone Island</a></strong> sells them outright at <b>11,000 C$</b> &mdash; worth knowing when your farming time is worth more than the money.</li>
<li><a href="#/e/exalted-relic">Exalted Relics</a> are far rarer and roll from a much stronger pool.</li></ul></div>

<h2 class="sh">The three rules</h2>
<div class="prose"><ol>
<li><strong>Bank relics before you roll.</strong> One relic is one roll and rolls are independent &mdash; a dry streak does not owe you anything.</li>
<li><strong>A roll overwrites the previous enchant.</strong> Stop when you land something you would be annoyed to lose.</li>
<li><strong>Spend exalted relics on a rod you will keep.</strong> Not the rod you are holding &mdash; the rod you will still be using in fifty hours.</li></ol></div>

<h2 class="sh">What to hope for</h2>
<div class="prose"><ul>
<li><a href="#/e/quantum">Quantum</a> &mdash; 25% of catches gain a mutation. The money enchant.</li>
<li><a href="#/e/sea-overlord">Sea Overlord</a> &mdash; +25% weight, which is +25% value on everything, unconditionally.</li>
<li><a href="#/e/invincible">Invincible</a> &mdash; fish the <a href="#/e/brine-pool">Brine Pool</a> and Roslit Volcano with any rod. Access, not power.</li>
<li><a href="#/e/immortal">Immortal</a> &mdash; the balanced pick if you carry one rod for everything.</li></ul>
<p>Use the <a href="#/t/odds">odds calculator</a> to sanity-check a relic grind before you commit an evening to it.</p></div>`},

codes: {n:"Codes",
 lede:"Codes in Fisch are short-lived &mdash; most are tied to an update or an event and stop working within weeks. These were reported active in early September 2026. Redeem them the day you read about them.",
 html:"CODES_BLOCK"},

sources: {n:"Accuracy &amp; sources",
 lede:"Fisch has an official wiki and a large community of unofficial ones, and they disagree in exactly the places you would expect: prices, drop rates, and anything a patch has touched recently. This page says where.",
 html:"SOURCES_BLOCK"},

progression: {n:"Progression roadmap",
 lede:"Eight phases from the Moosewood dock to the endgame money meta. Every step is one of the milestones the <a href=\"#/t/path\">path planner</a> reads, so ticking things here and answering the planner honestly should tell you the same story. The checklist saves in this browser.",
 html:"ROADMAP_BLOCK"}
};
