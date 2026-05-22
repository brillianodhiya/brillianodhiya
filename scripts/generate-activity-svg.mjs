import fs from 'fs';
import path from 'path';

const username = 'brillianodhiya';
const token = process.env.GITHUB_TOKEN || process.env.GH_PAT;

if (!token) {
  console.error("Error: GITHUB_TOKEN or GH_PAT is required.");
  process.exit(1);
}

const query = `
  query($username: String!) {
    user(login: $username) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

async function run() {
  try {
    console.log(`Fetching contributions for ${username}...`);
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'NodeJS-Activity-SVG-Generator'
      },
      body: JSON.stringify({ query, variables: { username } })
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const json = await res.json();
    if (json.errors) {
      throw new Error(JSON.stringify(json.errors));
    }

    const calendar = json.data.user.contributionsCollection.contributionCalendar;
    const totalContributions = calendar.totalContributions;
    
    // Build activity map
    const activityMap = {};
    calendar.weeks.forEach(week => {
      week.contributionDays.forEach(day => {
        activityMap[day.date] = day.contributionCount;
      });
    });

    console.log(`Total Contributions: ${totalContributions}`);

    // Generate grid dates
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

        gridHtml += `<rect x="${x}" y="${y}" width="11" height="11" fill="${fill}" stroke="${stroke}" stroke-width="1.5" rx="1.5" ry="1.5" />\n`;
        
        if (hasDiamond) {
          // Tiny diamond inside the square
          const dx = x + 5.5;
          const dy = y + 5.5;
          gridHtml += `<polygon points="${dx},${dy-3} ${dx+3},${dy} ${dx},${dy+3} ${dx-3},${dy}" fill="#00d4ff" />\n`;
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
  <rect x="33" y="203" width="${Math.max(4, progressBarFillWidth - 6)}" height="8" fill="#00d4ff" rx="1.5" />

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
    <polygon points="163,264 165,262 167,264 165,266" fill="#00d4ff" />

    <text x="180" y="269" class="font-pixel" font-size="9" fill="#a090b0">INTENSITY</text>
  </g>

  <!-- Right Footer Statistics -->
  <g transform="translate(0, 5)">
    <!-- Diamond Rank Indicator -->
    <polygon points="568,261 573,254 578,261 573,268" fill="#00d4ff" />
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
    console.log("Stunning retro Activity Log SVG generated successfully at dist/activity_log.svg!");

  } catch (err) {
    console.error("Error generating Activity Log SVG:", err);
    process.exit(1);
  }
}

run();
