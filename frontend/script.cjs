const fs = require('fs');
let code = fs.readFileSync('C:/Projects/TeamTime/frontend/src/pages/Profile.tsx', 'utf8');

// Replace Settings text
code = code.replace(/<h2>Settings<\/h2>/, '<h2>Ayarlar</h2>');
code = code.replace(/<p>Manage your preferences<\/p>/, '<p>Hesap ve görünüm tercihlerinizi yönetin.</p>');

// Replace Material Icons with simple SVG components inline (I will inject small SVGs)
const SVG_PERSON = `<svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg>`;
const SVG_LOCK = `<svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='11' width='18' height='11' rx='2' ry='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg>`;
const SVG_PALETTE = `<svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='13.5' cy='5.5' r='2.5'/><circle cx='20.5' cy='12.5' r='2.5'/><circle cx='6.5' cy='12.5' r='2.5'/><circle cx='13.5' cy='19.5' r='2.5'/></svg>`;
const SVG_TRASH = `<svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/></svg>`;
const SVG_CAMERA = `<svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'/><circle cx='12' cy='13' r='4'/></svg>`;
const SVG_MAIL = `<svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'/><polyline points='22,6 12,13 2,6'/></svg>`;
const SVG_CHECK = `<svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/></svg>`;
const SVG_WARNING = `<svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>`;

// Sidebar Icons
code = code.replace(/<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person<\/span>/, SVG_PERSON);
code = code.replace(/<span className="material-symbols-outlined">lock<\/span>/, SVG_LOCK);
code = code.replace(/<span className="material-symbols-outlined">palette<\/span>/, SVG_PALETTE);
code = code.replace(/<span className="material-symbols-outlined">delete<\/span>/, SVG_TRASH);

// Content Icons
code = code.replace(/<span className="material-symbols-outlined spin">progress_activity<\/span>/g, `<svg className='spin' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><line x1='12' y1='2' x2='12' y2='6'/><line x1='12' y1='18' x2='12' y2='22'/><line x1='4.93' y1='4.93' x2='7.76' y2='7.76'/><line x1='16.24' y1='16.24' x2='19.07' y2='19.07'/><line x1='2' y1='12' x2='6' y2='12'/><line x1='18' y1='12' x2='22' y2='12'/><line x1='4.93' y1='19.07' x2='7.76' y2='16.24'/><line x1='16.24' y1='7.76' x2='19.07' y2='4.93'/></svg>`);
code = code.replace(/<span className="material-symbols-outlined">photo_camera<\/span>/, SVG_CAMERA);
code = code.replace(/<span className="material-symbols-outlined">delete<\/span>/, SVG_TRASH);
code = code.replace(/<span className="material-symbols-outlined icon-prefix" style={{ fontVariationSettings: "'FILL' 0" }}>mail<\/span>/, '<span className="input-prefix">' + SVG_MAIL + '</span>');
code = code.replace(/<span className="material-symbols-outlined text-primary absolute right-3" style={{ fontVariationSettings: "'FILL' 1" }} title="Doğrulanmış">check_circle<\/span>/, '<span className="input-suffix" title="Doğrulanmış">' + SVG_CHECK + '</span>');
code = code.replace(/<span className="material-symbols-outlined">warning<\/span>/, SVG_WARNING);
code = code.replace(/<span className="material-symbols-outlined" style={{ fontSize: "18px" }}>delete_forever<\/span>/, SVG_TRASH);

// Fix layout classes
code = code.replace(/<div className="danger-zone flex flex-col gap-6">/g, '<div className="danger-surface flex flex-col gap-4">');
code = code.replace(/<div className="danger-icon-wrapper">/g, '<div className="danger-icon">');

// Update Form Input Classes
code = code.replace(/className="glass-input"/g, 'className="form-input"');
code = code.replace(/className="glass-input pl-10"/g, 'className="form-input pl-prefix pr-suffix"');
code = code.replace(/className="glass-input text-center/g, 'className="form-input text-center');

// Update grid rows
code = code.replace(/form-group-row/g, 'form-row');

// Update theme UI section completely
const oldThemeStr = `<div className="glass-panel p-xl">
                                <ThemeSwitcher />
                            </div>`;
const newThemeUI = `
                            <div className="glass-panel p-xl">
                                <div className="theme-grid">
                                    <button
                                        type="button"
                                        className={\`theme-card \${preference === "light" ? "active" : ""}\`}
                                        onClick={() => setPreference("light")}
                                    >
                                        <div className="theme-preview light">
                                            <div className="theme-mock-nav"></div>
                                            <div className="theme-mock-content"></div>
                                            <div className="theme-mock-content" style={{ width: '70%' }}></div>
                                        </div>
                                        <div className="theme-info">
                                            <span>Açık Tema</span>
                                            {preference === "light" && <span className="theme-check">✓</span>}
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        className={\`theme-card \${preference === "dark" ? "active" : ""}\`}
                                        onClick={() => setPreference("dark")}
                                    >
                                        <div className="theme-preview dark">
                                            <div className="theme-mock-nav"></div>
                                            <div className="theme-mock-content"></div>
                                            <div className="theme-mock-content" style={{ width: '70%' }}></div>
                                        </div>
                                        <div className="theme-info">
                                            <span>Koyu Tema</span>
                                            {preference === "dark" && <span className="theme-check">✓</span>}
                                        </div>
                                    </button>
                                </div>
                            </div>`;
                            
if (code.includes(oldThemeStr)) {
    code = code.replace(oldThemeStr, newThemeUI);
} else {
    // maybe \r\n
    code = code.replace(/<div className="glass-panel p-xl">\s*<ThemeSwitcher \/>\s*<\/div>/g, newThemeUI);
}

// Ensure useTheme is extracted
if (!code.includes('const { preference, setPreference } = useTheme();')) {
    code = code.replace(/const \[activeSection, setActiveSection\] = useState/g, 'const { preference, setPreference } = useTheme();\n    const [activeSection, setActiveSection] = useState');
}

if (!code.includes('import { useTheme } from "../hooks/useTheme";')) {
    code = code.replace(/import ThemeSwitcher from "..\/components\/ui\/ThemeSwitcher";/g, 'import { useTheme } from "../hooks/useTheme";');
}

fs.writeFileSync('C:/Projects/TeamTime/frontend/src/pages/Profile.tsx', code);
console.log('Successfully updated Profile.tsx');
