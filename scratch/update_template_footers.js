const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '../templates');

for (let i = 1; i <= 20; i++) {
  const filename = `template${i}.html`;
  const filepath = path.join(templatesDir, filename);
  if (!fs.existsSync(filepath)) continue;
  
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Find which class is used for signature blocks
  let classStr = "";
  let labelClass = "sign-label";
  
  if (content.includes('class="footer-sign"')) {
    classStr = 'footer-sign';
    labelClass = 'sign-label';
  } else if (content.includes('class="sign-block"')) {
    classStr = 'sign-block';
    labelClass = 'sign-label';
  } else if (content.includes('class="sign-col"')) {
    classStr = 'sign-col';
    if (content.includes('class="sign-text"')) {
      labelClass = 'sign-text';
    } else if (content.includes('class="sign-title"')) {
      labelClass = 'sign-title';
    } else {
      labelClass = 'sign-label';
    }
  }
  
  if (!classStr) {
    console.log(`⚠️ Could not find signature class in ${filename}`);
    continue;
  }
  
  // Find the last occurrence of the signature container class
  const searchPattern = `class="${classStr}"`;
  const lastIndex = content.lastIndexOf(searchPattern);
  if (lastIndex === -1) {
    console.log(`⚠️ Could not find last signature block in ${filename}`);
    continue;
  }
  
  // Locate the div start index (just before class=...)
  const divStartIndex = content.lastIndexOf('<div', lastIndex);
  if (divStartIndex === -1) {
    console.log(`⚠️ Could not find div start for ${filename}`);
    continue;
  }
  
  // Find the end of this div block (first closing </div> after divStartIndex)
  // We can count nested divs to find the matching closing tag
  let currentIndex = divStartIndex + 4; // skip '<div'
  let divCount = 1;
  let divEndIndex = -1;
  
  while (currentIndex < content.length && divCount > 0) {
    const nextClose = content.indexOf('</div>', currentIndex);
    const nextOpen = content.indexOf('<div', currentIndex);
    
    if (nextClose === -1) break;
    
    if (nextOpen !== -1 && nextOpen < nextClose) {
      divCount++;
      currentIndex = nextOpen + 4;
    } else {
      divCount--;
      if (divCount === 0) {
        divEndIndex = nextClose + 6; // include '</div>'
      } else {
        currentIndex = nextClose + 6;
      }
    }
  }
  
  if (divEndIndex === -1) {
    console.log(`⚠️ Could not find div end for ${filename}`);
    continue;
  }
  
  // Replace the inner signature block
  const originalBlock = content.substring(divStartIndex, divEndIndex);
  
  const replacementBlock = `<div class="${classStr}">
          <div style="height: 34px; display: flex; align-items: center; justify-content: center; margin-bottom: 2px;">{{SIGNATURE_IMG}}</div>
          <div class="sign-line" style="margin: 0 auto 2px; height: 1px; border: none; border-top: 1px solid currentColor;"></div>
          <div style="font-size: 7.5pt; font-weight: 700; color: inherit; line-height: 1.1;">{{SIGNATORY_NAME}}</div>
          <div class="${labelClass}" style="margin-top: 1px; font-size: 6.5pt; line-height: 1.0; text-transform: none; letter-spacing: 0;">{{SIGNATORY_TITLE}}</div>
        </div>`;
        
  content = content.substring(0, divStartIndex) + replacementBlock + content.substring(divEndIndex);
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`✅ Updated signatures in ${filename}`);
}
