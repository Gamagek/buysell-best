import catalog from "../content/career-research-catalog.json" with {type:"json"};

const ORIGIN="https://buysell.best";
const PUB=catalog.publicationDate;
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeJson=value=>JSON.stringify(value).replace(/</g,"\\u003c").replace(/&/g,"\\u0026");
const countryById=new Map(catalog.countries.map(c=>[c.id,c]));
const employerById=new Map(catalog.employers.map(e=>[e.id,e]));
export const CAREER_COUNTRIES=Object.freeze(catalog.countries);
export const CAREER_SECTORS=Object.freeze(catalog.sectors);
export const CAREER_GUIDES=Object.freeze(catalog.countries.flatMap(country=>
  catalog.sectors.map((sector,index)=>Object.freeze({
    country,sector,slug:country.id+"-"+sector.id+"-career-guide",
    title:sector.name+" Careers in "+country.name+": Employer Search & Application Guide",
    focus:country.roles[index],
    path:"/careers/"+country.id+"-"+sector.id+"-career-guide/"
  }))
));
export const careerGuidePath=guide=>guide.path;
export const findCareerGuide=slug=>CAREER_GUIDES.find(g=>g.slug===slug);
const siteLinks=[
  ["/insights/","Practical decision guides and comparisons"],
  ["/guides/","Buying guides for equipment and everyday needs"],
  ["/products/","Product checklists and supplier links"],
  ["/hotels/","Travel and accommodation comparisons"],
  ["/shopping-methodology/","Our editorial methodology"]
];

function documentFrame(title,description,path,body,jsonLd=[],isArticle=false){
 const canonical=ORIGIN+path;
 const graph={"@context":"https://schema.org","@type":isArticle?"Article":"CollectionPage",
   name:title,description,url:canonical,
   ...(isArticle?{headline:title,mainEntityOfPage:canonical,datePublished:PUB,
     author:{"@type":"Organization",name:"BuySell.Best Editorial",url:ORIGIN+"/shopping-methodology/"},
     publisher:{"@type":"Organization",name:"BuySell.Best",url:ORIGIN+"/"}}:{})};
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<title>'+esc(title)+' | BuySell.Best</title><meta name="description" content="'+esc(description)+'">'+
   '<link rel="canonical" href="'+esc(canonical)+'"><meta name="robots" content="index,follow,max-image-preview:large">'+
   '<meta property="og:type" content="'+(isArticle?'article':'website')+'"><meta property="og:title" content="'+esc(title)+'">'+
   '<meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+esc(canonical)+'">'+
   '<meta name="twitter:card" content="summary"><link rel="stylesheet" href="/css/style.css">'+
   '<link rel="stylesheet" href="/css/career-guides.css">'+
   [graph,...jsonLd].map(x=>'<script type="application/ld+json">'+safeJson(x)+'</script>').join('')+
   '</head><body class="career-page"><a class="career-skip" href="#main">Skip to content</a>'+
   '<header class="site-header"><div class="container nav-wrap"><a class="brand" href="/">BuySell<span class="brand-dot">.Best</span></a>'+
   '<nav class="nav" aria-label="Main navigation"><a href="/careers/">Careers</a><a href="/guides/">Shopping guides</a><a href="/insights/">Decision guides</a><a href="/products/">Products</a></nav></div></header>'+
   '<main id="main">'+body+'</main>'+
   '<footer class="site-footer"><div class="container career-footer"><strong>Independent career research by BuySell.Best</strong>'+
   '<p>Not a recruiter or employer. Availability, sponsorship, pay and eligibility must be verified on the employer website. '+
   'No job opening, vacancy, interview, compensation or endorsement is guaranteed.</p>'+
   '<nav><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a></nav></div></footer></body></html>';
}
function breadcrumbs(segments){
 return {"@context":"https://schema.org","@type":"BreadcrumbList",
 itemListElement:segments.map(([name,path],i)=>({"@type":"ListItem",position:i+1,name,item:ORIGIN+path}))};
}
function relatedLinks(current){
 const related=CAREER_GUIDES.filter(g=>g!==current && (g.country===current.country || g.sector===current.sector)).slice(0,5);
 return related.map(g=>'<li><a href="'+esc(g.path)+'">'+esc(g.sector.name)+' in '+esc(g.country.name)+'</a></li>').join("");
}
function employerLinks(guide){
 return guide.sector.employers.map(id=>employerById.get(id)).filter(Boolean).map(employer=>{
    const name=esc(employer.name), url=esc(employer.url);
    return '<li class="career-official-card"><h3>'+name+' — official careers portal</h3>'+
      '<p>'+esc(employer.note)+' Use the employer’s live search to confirm whether a suitable role is open in '+
      esc(guide.country.name)+'. This is not a specific current vacancy.</p>'+
      '<a class="career-apply" href="'+url+'" rel="noopener noreferrer" data-sponsored-navigation="job-destination" target="_self" '+
      'aria-label="Open '+name+' official careers search after an optional sponsored message">Open '+name+' official job search <span aria-hidden="true">↗</span></a></li>';
 }).join("");
}
function moreFields(){
 return '<aside class="career-more"><h2>More Interested Fields</h2>'+
   '<p>Outside career research, compare useful services and buyer decisions from the rest of our independent guides. '+
   'These links are optional and unrelated to any job application.</p><ul>'+
   siteLinks.map(([path,title])=>'<li><a href="'+esc(path)+'">'+esc(title)+' →</a></li>').join('')+
   '</ul></aside>';
}
export function renderCareerGuide(guide){
 const c=guide.country,s=guide.sector;
 const desc='Independent guide to '+s.name.toLowerCase()+' job searches in '+c.name+
 ': employer portals, work eligibility, skill evidence and screening questions. Not a live job vacancy.';
 const jobQuestions=s.checks.map((item,i)=>'<li><strong>'+['Role scope','Credentials','Evidence of impact','Contract terms'][i]+':</strong> '+esc(item)+'</li>').join('');
 const crumbs=breadcrumbs([['Home','/'],['International career guides','/careers/'],[guide.title,guide.path]]);
 const content='<div class="container career-wrap">'+
   '<nav class="career-breadcrumb"><a href="/">Home</a> <span>›</span> <a href="/careers/">Career research</a> <span>›</span> '+esc(c.name)+'</nav>'+
   '<article><header class="career-intro"><span class="career-eyebrow">COUNTRY-BASED CAREER RESEARCH · '+esc(c.name).toUpperCase()+'</span>'+
   '<h1>'+esc(guide.title)+'</h1><p class="career-deck">'+esc(guide.focus)+'</p>'+
   '<div class="career-meta">Published <time datetime="'+PUB+'">17 October 2026</time> · Independent editorial guide · Not a job advertisement</div>'+
   '<p class="career-disclosure"><strong>Before you apply:</strong> This page explains how to evaluate roles and links to employers’ official job searches. '+
   'It does not advertise an available vacancy, recruit on an employer’s behalf or promise sponsorship. '+
   'Official links may show no matching vacancy; verify the posting date, exact job ID and closing date on the employer site.</p></header>'+
   '<div class="career-layout"><div class="career-article">'+
   '<section><h2>Where to focus your search in '+esc(c.name)+'</h2>'+
   '<p>Consider '+esc(c.locations)+'. For '+esc(s.name.toLowerCase())+
   ', titles may hide very different responsibilities. This guide focuses on '+esc(s.focus)+'. '+
   'Use precise keywords such as '+esc(s.keywords)+' and then filter by workplace, seniority and permitted location.</p>'+
   '<p>'+esc(guide.focus)+' Rather than applying to every matching keyword, compare the real work, required evidence, '+
   'team structure and whether you are legally eligible for that specific vacancy. Employer career portals are the authoritative source for availability.</p></section>'+
   '<section><h2>Country-specific eligibility and compensation checks</h2><p>'+esc(c.visa)+'</p>'+
   '<p>'+esc(c.screen)+' A role advertised as hybrid or remote can still require local residency, scheduled time-zone coverage and visits to a designated office. '+
   'Verify salary currency, the full compensation package and any required local language on the actual posting. No salary estimate or visa promise is inferred here.</p></section>'+
   '<section><h2>Four screening questions for '+esc(s.name.toLowerCase())+'</h2>'+
   '<ol class="career-checklist">'+jobQuestions+'</ol>'+
   '<p>'+esc(s.evaluation)+' Adapt this evidence to the requirements published by each employer instead of sending identical generic applications.</p></section>'+
   '<section><h2>Review original company career portals</h2>'+
   '<p>These are employer-owned career searches rather than scraped or republished vacancy advertisements. '+
   'Choose a country in the employer interface, find a specific active opening, read it in full and apply from that original job page.</p>'+
   '<p class="career-ad-notice">An optional sponsored message may appear once before leaving BuySell.Best. '+
   'You can select <strong>Continue to the employer</strong> immediately without viewing, opening or clicking any advertisement. '+
   'The employer does not sponsor or endorse this guide.</p><ul class="career-employer-list">'+employerLinks(guide)+'</ul></section>'+
   '<section><h2>Application decision worksheet</h2><p>Use one row per real vacancy; record the official job ID rather than relying on a screenshot or social-media link. '+
   'A disciplined shortlist is more useful than repeated applications to roles that cannot accept your location or skills.</p>'+
   '<table class="career-worksheet"><thead><tr><th>Check</th><th>Your notes</th></tr></thead><tbody>'+
   '<tr><th>Employer and official job ID</th><td>Confirm on original portal</td></tr>'+
   '<tr><th>Country, city and remote rules</th><td>'+esc(c.name)+' eligibility</td></tr>'+
   '<tr><th>Skills and experience</th><td>'+esc(s.keywords)+'</td></tr>'+
   '<tr><th>Work authorization</th><td>Get employer-specific answer</td></tr>'+
   '<tr><th>Contract and deadline</th><td>Read live posting</td></tr></tbody></table></section>'+
   '<section><h2>Avoid recruitment fraud and misleading salary claims</h2>'+
   '<p>Apply only through the employer’s authenticated portal and verify the domain before sharing identification documents. '+
   'Do not pay a recruiter for a job offer, treat a social-media message as proof of employment or assume that a recruiter represents every company named here. '+
   'When a vacancy expires, stop relying on its old description and open the official search again.</p></section>'+
   '<section><h2>Related career paths</h2><ul class="career-related">'+relatedLinks(guide)+'</ul></section>'+
   moreFields()+'</div>'+
   '<aside class="career-sidebar"><h2>Quick research checklist</h2><p><strong>Country:</strong> '+esc(c.name)+'</p>'+
   '<p><strong>Focus:</strong> '+esc(s.name)+'</p><p><strong>Sources:</strong> employer-owned career search portals</p>'+
   '<p><strong>Availability:</strong> not independently guaranteed</p>'+
   '<p><strong>Work rights:</strong> review every live vacancy</p><a href="/careers/">Browse all 50 career guides →</a></aside></div></article></div>';
 return documentFrame(guide.title,desc,guide.path,content,[crumbs],true);
}
export function renderCareerIndex(){
 const heading='International Career Research: 50 Country & Specialist Job Search Guides';
 const intro='Explore independent career-search guides for ten countries across cybersecurity, cloud engineering, financial compliance, life sciences and industrial energy engineering. Compare local eligibility and explore official employer portals. These are not live job postings.';
 const sections=CAREER_COUNTRIES.map(c=>{
   const cards=CAREER_GUIDES.filter(g=>g.country===c).map(g=>
    '<li><a href="'+esc(g.path)+'"><strong>'+esc(g.sector.name)+'</strong><span>'+esc(g.focus)+'</span><span class="career-read">Read guide →</span></a></li>'
   ).join('');
   return '<section id="'+esc(c.id)+'" class="career-country"><h2>'+esc(c.name)+'</h2>'+
   '<p>'+esc(c.screen)+'</p><ul class="career-grid">'+cards+'</ul></section>';
 }).join('');
 const content='<div class="container career-wrap"><header class="career-intro"><span class="career-eyebrow">10 COUNTRIES · 5 SPECIALIST FIELDS</span>'+
 '<h1>'+esc(heading)+'</h1><p class="career-deck">'+esc(intro)+'</p>'+
 '<p class="career-disclosure">We do not offer jobs, represent hiring companies or guarantee vacancies. Select a guide to compare the requirements of real employer searches. '+
 'Sponsored promotions are separate and never required to browse.</p></header>'+
 '<nav class="career-country-nav" aria-label="Jump to country">'+CAREER_COUNTRIES.map(c=>'<a href="#'+esc(c.id)+'">'+esc(c.name)+'</a>').join('')+'</nav>'+
 sections+moreFields()+'</div>';
 return documentFrame(heading,intro,'/careers/',content,[breadcrumbs([['Home','/'],['International career guides','/careers/']])]);
}
export function careerSitemapEntries(){
 const entries=[{path:'/careers/'},...CAREER_GUIDES.map(g=>({path:g.path}))];
 return entries.map(e=>'<url><loc>'+ORIGIN+esc(e.path)+'</loc><lastmod>'+PUB+'</lastmod></url>').join('');
}
