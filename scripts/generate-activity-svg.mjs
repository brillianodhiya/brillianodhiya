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

    // Ensure output directory exists
    const distDir = path.resolve(process.cwd(), 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    fs.writeFileSync(path.resolve(distDir, 'activity_log.svg'), svg);
    console.log("Stunning unified (GitHub + GitLab) Activity Log SVG generated successfully at dist/activity_log.svg!");

  } catch (err) {
    console.error("Error generating Activity Log SVG:", err);
    process.exit(1);
  }
}

run();
