// Existing real page /products/trending-100/ references this local SVG image set.
export const TRENDING_ART_FILES = Object.freeze(["bluetooth-earbuds.svg","compact-power-bank.svg","external-ssd-enclosure.svg","foldable-phone-stand.svg","laptop-cooling-stand.svg","laptop-sleeve.svg","led-desk-lamp.svg","magnetic-phone-mount.svg","mechanical-keyboard.svg","multi-port-usb-c-charger.svg","over-ear-wireless-headphones.svg","portable-bluetooth-speaker.svg","rgb-light-strip.svg","tempered-glass-screen-protector.svg","usb-c-fast-charging-cable.svg","usb-c-hub-adapter.svg","usb-condenser-microphone.svg","webcam-with-privacy-cover.svg","wireless-charging-pad.svg","wireless-ergonomic-mouse.svg"]);
export function trendingSitemapEntry() {
  return '<url><loc>https://buysell.best/products/trending-100/</loc><lastmod>2026-10-20</lastmod>'+TRENDING_ART_FILES.map(file=>'<image:image><image:loc>https://buysell.best/assets/products/trending-100/'+file+'</image:loc></image:image>').join('')+'</url>';
}
