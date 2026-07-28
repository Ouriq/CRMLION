const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The pattern for the sidebar is somewhat predictable.
// It starts with <div className="crm-icon-sidebar"> and ends with </div>\n      </div>\n
const sidebarRegex = /<div className="crm-icon-sidebar">[\s\S]*?<div className="icon-sidebar-bottom">[\s\S]*?<\/button>\s*<\/div>\s*<\/div>/g;

content = content.replace(sidebarRegex, '{renderSidebar()}');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced all sidebars with {renderSidebar()}');
