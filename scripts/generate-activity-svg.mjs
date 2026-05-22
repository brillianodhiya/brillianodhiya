import fs from 'fs';
import path from 'path';

// Supabase Configuration from Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required.");
  process.exit(1);
}

async function run() {
  try {
    console.log("Fetching combined GitHub & GitLab activity logs from Supabase...");
    
    const res = await fetch(`${supabaseUrl}/rest/v1/portfolio_activity_log?select=*&limit=1000`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'NodeJS-Activity-SVG-Generator'
      }
    });

    if (!res.ok) {
      throw new Error(`Supabase REST API returned status ${res.status}`);
    }

    const data = await res.json();
    
    // Build activity map and total contributions count
    let totalContributions = 0;
    const activityMap = {};
    
    data.forEach(log => {
      activityMap[log.date] = log.count;
      totalContributions += log.count;
    });

    console.log(`Total Combined Contributions: ${totalContributions}`);

    // Generate grid dates (53 weeks)
    const WEEKS = 53;
    const DAYS_PER_WEEK = 7;
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 364);
    const startOfWeek = new Date(start);
    startOfWeek.setDate(start.getDate() - start.getDay());

    let gridHtml = '';
    
    // Draw cells
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < DAYS_PER_WEEK; d++) {
        const currentDate = new Date(startOfWeek);
        currentDate.setDate(startOfWeek.getDate() + (w * 7 + d));
        const dateStr = currentDate.toISOString().split('T')[0];
        const count = activityMap[dateStr] || 0;

        // Position calculations
        const x = 30 + w * 15;
        const y = 70 + d * 15;

        // Color mapping matching portfolio theme
        let fill = '#261642';
        let stroke = '#39225c';
        let hasDiamond = false;

        if (count > 0) {
          if (count < 3) {
            fill = '#0e4429';
            stroke = '#1b613b';
          } else if (count < 6) {
            fill = '#006d32';
            stroke = '#26a641';
          } else if (count < 10) {
            fill = '#26a641';
            stroke = '#39d353';
          } else {
            fill = '#39d353';
            stroke = '#ffffff';
            hasDiamond = true;
          }
        }

        gridHtml += `<rect class="cell-interactive" x="${x}" y="${y}" width="11" height="11" fill="${fill}" stroke="${stroke}" stroke-width="1.5" rx="1.5" ry="1.5" />\n`;
        
        if (hasDiamond) {
          // Tiny diamond inside the square
          const dx = x + 5.5;
          const dy = y + 5.5;
          const delay = ((w + d) % 5) * 0.6;
          gridHtml += `<polygon class="diamond-sparkle" style="animation-delay: ${delay.toFixed(1)}s;" points="${dx},${dy-3} ${dx+3},${dy} ${dx},${dy+3} ${dx-3},${dy}" fill="#00d4ff" />\n`;
        }
      }
    }

    // Dynamic level calculation based on birth date (25 years old)
    const birthDate = '2000-08-24'; // Matches Home.tsx
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    const lastBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    if (lastBirthday > today) {
      lastBirthday.setFullYear(lastBirthday.getFullYear() - 1);
    }
    const nextBirthday = new Date(lastBirthday.getFullYear() + 1, birth.getMonth(), birth.getDate());
    const totalMs = nextBirthday.getTime() - lastBirthday.getTime();
    const currentMs = today.getTime() - lastBirthday.getTime();
    const expPercent = Math.min(100, Math.max(0, Math.floor((currentMs / totalMs) * 100)));
    const progressBarFillWidth = Math.floor(820 * (expPercent / 100));

    // Construct the complete SVG
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="880" height="340" viewBox="0 0 880 340" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .font-pixel {
      font-family: 'Courier New', Courier, monospace;
      font-weight: bold;
    }
    .scanlines {
      opacity: 0.04;
      animation: crt-flicker 0.15s infinite;
    }
    .xp-bar-fill {
      animation: xp-pulse 2.5s infinite ease-in-out;
    }
    .diamond-sparkle {
      transform-box: fill-box;
      transform-origin: center;
      animation: diamond-twinkle 3s infinite ease-in-out;
    }
    .cell-interactive {
      transform-box: fill-box;
      transform-origin: center;
      transition: all 0.25s ease-in-out;
    }
    .cell-interactive:hover {
      transform: scale(1.3);
      filter: brightness(1.4) saturate(1.2);
      stroke: #00d4ff !important;
      stroke-width: 2px !important;
    }
    .arcade-blink {
      animation: text-blink 1.2s infinite;
    }

    @keyframes crt-flicker {
      0% { opacity: 0.02; }
      50% { opacity: 0.05; }
      100% { opacity: 0.02; }
    }
    @keyframes xp-pulse {
      0% { opacity: 0.85; fill: #00a3c4; }
      50% { opacity: 1; fill: #00d4ff; }
      100% { opacity: 0.85; fill: #00a3c4; }
    }
    @keyframes diamond-twinkle {
      0% { transform: scale(0.9); opacity: 0.4; fill: #00d4ff; }
      50% { transform: scale(1.3); opacity: 1; fill: #ffffff; }
      100% { transform: scale(0.9); opacity: 0.4; fill: #00d4ff; }
    }
    @keyframes text-blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0.2; }
    }
  </style>

  <!-- Double Pixel Outer Frame -->
  <rect x="2" y="2" width="876" height="336" fill="#1b0e2b" rx="8" stroke="#39225c" stroke-width="4" />
  <rect x="8" y="8" width="864" height="324" fill="#1b0e2b" rx="6" stroke="#ffffff" stroke-width="2.5" />
  
  <!-- SCANLINE OVERLAY FOR AUTHENTIC RETRO DISPLAY -->
  <g class="scanlines">
    ${Array.from({ length: 85 }, (_, i) => `<line x1="12" y1="${12 + i * 4}" x2="868" y2="${12 + i * 4}" stroke="#ffffff" stroke-width="1.5" />`).join('\n')}
  </g>

  <!-- Headers -->
  <text x="30" y="45" class="font-pixel" font-size="18" fill="#00d4ff" letter-spacing="1">ACTIVITY LOG</text>
  <text x="850" y="43" class="font-pixel" font-size="13" fill="#a090b0" text-anchor="end" font-weight="normal">Contributions</text>

  <!-- Grid rendering -->
  ${gridHtml}

  <!-- RPG Progress Bar (XP) -->
  <text x="30" y="193" class="font-pixel" font-size="10" fill="#00d4ff" letter-spacing="0.5">EXP LEVEL PROGRESS: ${expPercent}%</text>
  
  <!-- Progress Bar Container -->
  <rect x="30" y="200" width="820" height="14" fill="#11071c" stroke="#39225c" stroke-width="2" rx="3" />
  <!-- Progress Bar Fill -->
  <rect class="xp-bar-fill" x="33" y="203" width="${Math.max(4, progressBarFillWidth - 6)}" height="8" fill="#00d4ff" rx="1.5" />

  <!-- Footer Legend -->
  <g transform="translate(0, 5)">
    <!-- Legend Container -->
    <rect x="30" y="245" width="230" height="40" fill="#11071c" stroke="#39225c" stroke-width="2" rx="4" />
    <text x="42" y="269" class="font-pixel" font-size="9" fill="#a090b0">RARITY:</text>
    
    <!-- Legend Blocks -->
    <rect x="98" y="259" width="10" height="10" fill="#261642" stroke="#39225c" stroke-width="1" rx="1" />
    <rect x="113" y="259" width="10" height="10" fill="#0e4429" stroke="#1b613b" stroke-width="1" rx="1" />
    <rect x="128" y="259" width="10" height="10" fill="#006d32" stroke="#26a641" stroke-width="1" rx="1" />
    <rect x="143" y="259" width="10" height="10" fill="#26a641" stroke="#39d353" stroke-width="1" rx="1" />
    <rect x="158" y="259" width="10" height="10" fill="#39d353" stroke="#ffffff" stroke-width="1" rx="1" />
    <polygon class="diamond-sparkle" points="163,264 165,262 167,264 165,266" fill="#00d4ff" />

    <text x="180" y="269" class="font-pixel" font-size="9" fill="#a090b0">INTENSITY</text>
  </g>

  <!-- Right Footer Statistics -->
  <g transform="translate(0, 5)">
    <!-- Diamond Rank Indicator -->
    <polygon class="arcade-blink" points="568,261 573,254 578,261 573,268" fill="#00d4ff" />
    <text x="586" y="265" class="font-pixel" font-size="11" fill="#00d4ff" letter-spacing="0.5">ELITE RADIANCE</text>
    
    <!-- Total Contributions -->
    <text x="850" y="265" class="font-pixel" font-size="11" fill="#ffffff" text-anchor="end" letter-spacing="0.5">
      <tspan fill="#00d4ff">${totalContributions}</tspan> CONTRIBUTIONS COLLECTED
    </text>
    <line x1="565" y1="274" x2="850" y2="274" stroke="#39225c" stroke-width="2.5" />
  </g>
</svg>
`;

    // Construct the dynamic Character Status SVG
    const statusSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="880" height="340" viewBox="0 0 880 340" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .font-pixel {
      font-family: 'Courier New', Courier, monospace;
      font-weight: bold;
    }
    .scanlines {
      opacity: 0.04;
      animation: crt-flicker 0.15s infinite;
    }
    .xp-bar-fill {
      animation: xp-pulse 2.5s infinite ease-in-out;
    }
    .stat-bar-fill {
      transform-box: fill-box;
      transform-origin: left;
      animation: stat-slide-in 1.5s cubic-bezier(0.1, 1, 0.1, 1) forwards;
    }
    .bobbing-sprite {
      animation: bobbing 2s infinite ease-in-out;
      transform-box: fill-box;
      transform-origin: center;
    }
    .arcade-blink {
      animation: text-blink 1.2s infinite;
    }

    @keyframes crt-flicker {
      0% { opacity: 0.02; }
      50% { opacity: 0.05; }
      100% { opacity: 0.02; }
    }
    @keyframes xp-pulse {
      0% { opacity: 0.85; fill: #ff007f; }
      50% { opacity: 1; fill: #ff55a3; }
      100% { opacity: 0.85; fill: #ff007f; }
    }
    @keyframes stat-slide-in {
      from { transform: scaleX(0); }
      to { transform: scaleX(1); }
    }
    @keyframes bobbing {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-4px); }
      100% { transform: translateY(0px); }
    }
    @keyframes text-blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0.2; }
    }
  </style>

  <!-- Double Pixel Outer Frame -->
  <rect x="2" y="2" width="876" height="336" fill="#1b0e2b" rx="8" stroke="#39225c" stroke-width="4" />
  <rect x="8" y="8" width="864" height="324" fill="#1b0e2b" rx="6" stroke="#ffffff" stroke-width="2.5" />
  
  <!-- SCANLINE OVERLAY FOR AUTHENTIC RETRO DISPLAY -->
  <g class="scanlines">
    ${Array.from({ length: 85 }, (_, i) => `<line x1="12" y1="${12 + i * 4}" x2="868" y2="${12 + i * 4}" stroke="#ffffff" stroke-width="1.5" />`).join('\n')}
  </g>

  <!-- Left Column Header -->
  <text x="30" y="45" class="font-pixel" font-size="16" fill="#ff007f" letter-spacing="1">[🎮 CHARACTER STATUS]</text>

  <!-- Left Column Info -->
  <g transform="translate(0, 10)">
    <!-- Name -->
    <text x="30" y="80" class="font-pixel" font-size="12" fill="#ffffff">NAME: <tspan fill="#00d4ff">Brilliano Dhiya Ulhaq (Brilli)</tspan></text>
    
    <!-- Class -->
    <text x="30" y="110" class="font-pixel" font-size="12" fill="#ffffff">CLASS: <tspan fill="#00d4ff">Frontend Developer</tspan></text>
    
    <!-- Level -->
    <text x="30" y="140" class="font-pixel" font-size="12" fill="#ffffff">LEVEL: <tspan fill="#00d4ff">Lv ${age}</tspan></text>
    
    <!-- EXP Progress Text -->
    <text x="30" y="170" class="font-pixel" font-size="10" fill="#a090b0">EXP PROGRESS: ${expPercent}%</text>
    
    <!-- EXP Bar Container -->
    <rect x="30" y="178" width="360" height="14" fill="#11071c" stroke="#39225c" stroke-width="2" rx="3" />
    <!-- EXP Bar Fill -->
    <rect class="xp-bar-fill" x="33" y="181" width="${Math.max(4, Math.floor(354 * (expPercent / 100)))}" height="8" fill="#ff007f" rx="1.5" />

    <!-- Rank -->
    <text x="30" y="225" class="font-pixel" font-size="12" fill="#ffffff">
      RANK: <tspan fill="#00d4ff">Elite Radiance</tspan>
    </text>
    <text x="30" y="243" class="font-pixel" font-size="10" fill="#a090b0">
      (${totalContributions} Contributions Collected)
    </text>
    
    <!-- Region -->
    <text x="30" y="280" class="font-pixel" font-size="12" fill="#ffffff">
      REGION: <tspan fill="#00d4ff">Earth 📍 Cikarang, Indonesia (GMT+7)</tspan>
    </text>
  </g>

  <!-- Right Column Title -->
  <text x="460" y="45" class="font-pixel" font-size="16" fill="#00d4ff" letter-spacing="1">[⚔️ ABILITIES &amp; STATS]</text>

  <!-- Cute Gamepad Sprite top right -->
  <g class="bobbing-sprite" transform="translate(800, 25)">
    <!-- Gamepad Body -->
    <rect x="0" y="0" width="36" height="22" rx="4" fill="#39225c" stroke="#ffffff" stroke-width="2" />
    <!-- D-Pad -->
    <rect x="6" y="8" width="8" height="4" fill="#00d4ff" />
    <rect x="8" y="6" width="4" height="8" fill="#00d4ff" />
    <!-- Buttons -->
    <circle cx="24" cy="11" r="2" fill="#ff007f" />
    <circle cx="29" cy="11" r="2" fill="#ff007f" />
  </g>

  <!-- Right Column Stats -->
  <g transform="translate(0, 10)">
    <!-- Stat 1: AGI -->
    <text x="460" y="80" class="font-pixel" font-size="11" fill="#ffffff">AGI (Frontend Speed): <tspan fill="#00d4ff">90 / 100</tspan></text>
    <rect x="460" y="88" width="380" height="10" fill="#11071c" stroke="#39225c" stroke-width="1.5" rx="2" />
    <rect class="stat-bar-fill" x="462" y="90" width="340" height="6" fill="#00d4ff" rx="1" />

    <!-- Stat 2: STR -->
    <text x="460" y="135" class="font-pixel" font-size="11" fill="#ffffff">STR (Fullstack Power): <tspan fill="#ff007f">89 / 100</tspan></text>
    <rect x="460" y="143" width="380" height="10" fill="#11071c" stroke="#39225c" stroke-width="1.5" rx="2" />
    <rect class="stat-bar-fill" x="462" y="145" width="336" height="6" fill="#ff007f" rx="1" />

    <!-- Stat 3: INT -->
    <text x="460" y="190" class="font-pixel" font-size="11" fill="#ffffff">INT (Data Analysis): <tspan fill="#bd00ff">78 / 100</tspan></text>
    <rect x="460" y="198" width="380" height="10" fill="#11071c" stroke="#39225c" stroke-width="1.5" rx="2" />
    <rect class="stat-bar-fill" x="462" y="200" width="294" height="6" fill="#bd00ff" rx="1" />

    <!-- Stat 4: VIT -->
    <text x="460" y="245" class="font-pixel" font-size="11" fill="#ffffff">VIT (Security, SEO): <tspan fill="#39d353">92 / 100</tspan></text>
    <rect x="460" y="253" width="380" height="10" fill="#11071c" stroke="#39225c" stroke-width="1.5" rx="2" />
    <rect class="stat-bar-fill" x="462" y="255" width="347" height="6" fill="#39d353" rx="1" />
  </g>
</svg>
`;

    // Ensure output directory exists
    const distDir = path.resolve(process.cwd(), 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    fs.writeFileSync(path.resolve(distDir, 'activity_log.svg'), svg);
    fs.writeFileSync(path.resolve(distDir, 'character_status.svg'), statusSvg);
    console.log("Stunning unified Activity Log and Character Status SVGs generated successfully!");

  } catch (err) {
    console.error("Error generating SVGs:", err);
    process.exit(1);
  }
}

run();

