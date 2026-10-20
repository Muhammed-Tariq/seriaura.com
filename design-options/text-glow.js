/* Compatibility for older preview wrappers; the selected background is idempotent. */
const textBackgroundScript=document.createElement('script');
textBackgroundScript.src=new URL('../text-background.js',document.currentScript.src).href;
document.head.append(textBackgroundScript);
