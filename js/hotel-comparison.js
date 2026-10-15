(function () {
  "use strict";
  const form=document.getElementById("hotel-quote-form");
  if (!form) return;
  const fields=[...form.querySelectorAll("[data-quote-id]")];
  const currency=document.getElementById("quote-currency"), result=document.getElementById("quote-result");
  const emptyMessage="Enter at least two matching quotes to compare. Amounts stay in this page and are not sent to a booking site.";
  const money=value=>currency.value==="OTHER" ? new Intl.NumberFormat("en",{maximumFractionDigits:2}).format(value)+" (your chosen currency)" : new Intl.NumberFormat("en",{style:"currency",currency:currency.value}).format(value);
  function compare() {
    const quotes=fields.filter(field=>field.value.trim()!=="").map(field=>({name:field.dataset.quoteName,value:Number(field.value)}));
    if (quotes.some(quote=>!Number.isFinite(quote.value)||quote.value<0||quote.value>999999999)) {result.textContent="Use valid non-negative totals in the same currency."; return;}
    if (quotes.length<2) {result.textContent=emptyMessage;return;}
    quotes.sort((a,b)=>a.value-b.value);
    const lowest=quotes[0].value, ties=quotes.filter(quote=>quote.value===lowest).map(quote=>quote.name);
    const highest=quotes[quotes.length-1].value;
    result.textContent=`Lowest entered total: ${ties.join(" and ")} — ${money(lowest)}. ${quotes.length} quotes compared; difference from the highest entered total: ${money(highest-lowest)}. Confirm matching room, fees and cancellation terms. These are your inputs, not live prices or a market-wide cheapest-price claim.`;
  }
  form.addEventListener("submit",event=>{event.preventDefault();compare();});
  form.addEventListener("input",()=>{result.textContent="Quotes changed. Compare again after checking that all totals use the same currency and stay conditions.";});
  form.addEventListener("reset",()=>{result.textContent=emptyMessage;});
  currency.addEventListener("change",()=>{fields.forEach(field=>{field.value="";});result.textContent="Currency changed; amounts cleared. Enter fresh quotes in "+(currency.value==="OTHER"?"one currency":currency.value)+".";});
  const tripForm=document.getElementById("hotel-trip-form");
  const checkin=document.getElementById("hotel-checkin"), checkout=document.getElementById("hotel-checkout");
  function updateCheckout() {
    if (!checkin.value) {checkout.removeAttribute("min");return;}
    const next=new Date(checkin.value+"T00:00:00Z");next.setUTCDate(next.getUTCDate()+1);
    checkout.min=next.toISOString().slice(0,10);
  }
  checkin.addEventListener("change",updateCheckout); updateCheckout();
  tripForm.addEventListener("submit",event=>{
    checkout.setCustomValidity("");
    if (Boolean(checkin.value)!==Boolean(checkout.value) || (checkin.value && checkout.value<=checkin.value)) {
      event.preventDefault();checkout.setCustomValidity("Choose both dates, with check-out after check-in.");checkout.reportValidity();
    }
  });
  checkout.addEventListener("input",()=>checkout.setCustomValidity(""));
  checkin.addEventListener("input",()=>checkout.setCustomValidity(""));
})();
