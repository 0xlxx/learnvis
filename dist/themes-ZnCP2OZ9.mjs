//#region vis/color.ts
/**
* Convert an oklch() CSS color string to #rrggbb hex.
* Falls through unchanged if the input is not an oklch color.
*
* Math: oklch → oklab → linear sRGB → gamma-corrected sRGB → hex.
* Reference: https://www.w3.org/TR/css-color-4/#oklab-to-srgb
*/
function oklchToHex(c) {
	if (!c.startsWith("oklch(")) return c;
	const m = c.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\)/);
	if (!m) return c;
	const L = parseFloat(m[1]);
	const C = parseFloat(m[2]);
	const H = parseFloat(m[3]);
	const alpha = m[4] ? parseFloat(m[4]) : 1;
	const hRad = H * Math.PI / 180;
	const a = C * Math.cos(hRad);
	const b = C * Math.sin(hRad);
	const l_ = L + .3963377774 * a + .2158037573 * b;
	const m_ = L - .1055613458 * a - .0638541728 * b;
	const s_ = L - .0894841775 * a - 1.291485548 * b;
	const l3 = l_ * l_ * l_;
	const m3 = m_ * m_ * m_;
	const s3 = s_ * s_ * s_;
	const rLin = 4.0767416621 * l3 - 3.3077115913 * m3 + .2309699292 * s3;
	const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - .3413193965 * s3;
	const bLin = -.0041960863 * l3 - .7034186147 * m3 + 1.707614701 * s3;
	const toSRGB = (v) => {
		const abs = Math.abs(v);
		return abs <= .0031308 ? 12.92 * v : 1.055 * Math.pow(abs, 1 / 2.4) - .055;
	};
	const clamp = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
	const R = clamp(toSRGB(rLin));
	const G = clamp(toSRGB(gLin));
	const B = clamp(toSRGB(bLin));
	const hex = "#" + [
		R,
		G,
		B
	].map((v) => v.toString(16).padStart(2, "0")).join("");
	if (alpha < 1) {
		const blend = (c) => Math.round(c * alpha + 255 * (1 - alpha));
		return "#" + [
			blend(R),
			blend(G),
			blend(B)
		].map((v) => v.toString(16).padStart(2, "0")).join("");
	}
	return hex;
}
/**
* Ensure a color value is safe for SVG attributes.
* Converts oklch → hex; passes everything else through unchanged.
* Also handles the CSS `var(--xxx)` and `none` keywords.
*/
function svgColor(c) {
	if (!c) return c ?? "";
	if (c.startsWith("var(") || c === "none" || c.startsWith("#")) return c;
	if (c.startsWith("oklch(")) return oklchToHex(c);
	return c;
}

//#endregion
//#region vis/themes.ts
const themes = {
	warm: {
		name: "warm",
		desc: "暖色调 · 教学友好 · 琥珀+青",
		palette: {
			primary: {
				fg: "oklch(0.55 0.20 55)",
				bg: "oklch(0.88 0.08 55)"
			},
			accent: {
				fg: "oklch(0.57 0.15 180)",
				bg: "oklch(0.88 0.06 180)"
			},
			danger: {
				fg: "oklch(0.48 0.18 22)",
				bg: "oklch(0.88 0.04 22)"
			},
			warning: {
				fg: "oklch(0.58 0.20 85)",
				bg: "oklch(0.90 0.08 85)"
			},
			info: {
				fg: "oklch(0.50 0.12 240)",
				bg: "oklch(0.88 0.04 240)"
			},
			dim: {
				fg: "oklch(0.50 0.02 60)",
				bg: "oklch(0.90 0.01 75)"
			},
			muted: {
				fg: "oklch(0.50 0.02 60)",
				bg: "oklch(0.90 0.01 75)"
			},
			success: {
				fg: "oklch(0.48 0.18 150)",
				bg: "oklch(0.88 0.06 150)"
			}
		}
	},
	cool: {
		name: "cool",
		desc: "冷色调 · 科技感 · 蓝+薄荷",
		palette: {
			primary: {
				fg: "oklch(0.52 0.14 250)",
				bg: "oklch(0.88 0.05 250)"
			},
			accent: {
				fg: "oklch(0.55 0.11 160)",
				bg: "oklch(0.88 0.05 160)"
			},
			danger: {
				fg: "oklch(0.50 0.16 10)",
				bg: "oklch(0.88 0.04 10)"
			},
			warning: {
				fg: "oklch(0.58 0.18 90)",
				bg: "oklch(0.90 0.06 90)"
			},
			info: {
				fg: "oklch(0.48 0.10 250)",
				bg: "oklch(0.88 0.04 250)"
			},
			dim: {
				fg: "oklch(0.50 0.02 250)",
				bg: "oklch(0.90 0.01 250)"
			},
			muted: {
				fg: "oklch(0.50 0.02 250)",
				bg: "oklch(0.90 0.01 250)"
			},
			success: {
				fg: "oklch(0.50 0.14 150)",
				bg: "oklch(0.88 0.05 150)"
			}
		}
	},
	dark: {
		name: "dark",
		desc: "暗色 · 终端风 · 亮色前景",
		palette: {
			primary: {
				fg: "oklch(0.72 0.16 65)",
				bg: "oklch(0.28 0.05 65)"
			},
			accent: {
				fg: "oklch(0.68 0.13 155)",
				bg: "oklch(0.24 0.05 155)"
			},
			danger: {
				fg: "oklch(0.62 0.16 25)",
				bg: "oklch(0.24 0.04 25)"
			},
			warning: {
				fg: "oklch(0.72 0.18 85)",
				bg: "oklch(0.26 0.05 85)"
			},
			info: {
				fg: "oklch(0.62 0.12 240)",
				bg: "oklch(0.24 0.04 240)"
			},
			dim: {
				fg: "oklch(0.50 0.03 260)",
				bg: "oklch(0.22 0.01 260)"
			},
			muted: {
				fg: "oklch(0.50 0.03 260)",
				bg: "oklch(0.22 0.01 260)"
			},
			success: {
				fg: "oklch(0.62 0.15 150)",
				bg: "oklch(0.26 0.05 150)"
			}
		}
	},
	paper: {
		name: "paper",
		desc: "学术风 · 极简 · 墨色+白",
		palette: {
			primary: {
				fg: "oklch(0.38 0.03 60)",
				bg: "oklch(0.92 0.01 80)"
			},
			accent: {
				fg: "oklch(0.42 0.06 150)",
				bg: "oklch(0.90 0.02 150)"
			},
			danger: {
				fg: "oklch(0.35 0.06 20)",
				bg: "oklch(0.90 0.02 20)"
			},
			warning: {
				fg: "oklch(0.45 0.08 80)",
				bg: "oklch(0.92 0.02 80)"
			},
			info: {
				fg: "oklch(0.40 0.06 240)",
				bg: "oklch(0.90 0.02 240)"
			},
			dim: {
				fg: "oklch(0.45 0.01 80)",
				bg: "oklch(0.94 0.01 80)"
			},
			muted: {
				fg: "oklch(0.45 0.01 80)",
				bg: "oklch(0.94 0.01 80)"
			},
			success: {
				fg: "oklch(0.40 0.08 150)",
				bg: "oklch(0.90 0.03 150)"
			}
		}
	},
	vivid: {
		name: "vivid",
		desc: "高饱和 · 演示/演讲 · 亮色",
		palette: {
			primary: {
				fg: "oklch(0.62 0.22 68)",
				bg: "oklch(0.88 0.10 68)"
			},
			accent: {
				fg: "oklch(0.58 0.18 180)",
				bg: "oklch(0.86 0.08 180)"
			},
			danger: {
				fg: "oklch(0.55 0.22 22)",
				bg: "oklch(0.86 0.08 22)"
			},
			warning: {
				fg: "oklch(0.65 0.24 85)",
				bg: "oklch(0.90 0.10 85)"
			},
			info: {
				fg: "oklch(0.52 0.16 250)",
				bg: "oklch(0.86 0.06 250)"
			},
			dim: {
				fg: "oklch(0.52 0.03 80)",
				bg: "oklch(0.90 0.01 80)"
			},
			muted: {
				fg: "oklch(0.52 0.03 80)",
				bg: "oklch(0.90 0.01 80)"
			},
			success: {
				fg: "oklch(0.55 0.20 150)",
				bg: "oklch(0.86 0.08 150)"
			}
		}
	},
	soft: {
		name: "soft",
		desc: "低对比 · 柔和 · 灰绿基调",
		palette: {
			primary: {
				fg: "oklch(0.50 0.06 140)",
				bg: "oklch(0.90 0.02 140)"
			},
			accent: {
				fg: "oklch(0.48 0.05 200)",
				bg: "oklch(0.90 0.02 200)"
			},
			danger: {
				fg: "oklch(0.42 0.08 30)",
				bg: "oklch(0.88 0.02 30)"
			},
			warning: {
				fg: "oklch(0.50 0.08 90)",
				bg: "oklch(0.90 0.03 90)"
			},
			info: {
				fg: "oklch(0.45 0.05 240)",
				bg: "oklch(0.90 0.02 240)"
			},
			dim: {
				fg: "oklch(0.48 0.02 100)",
				bg: "oklch(0.92 0.01 100)"
			},
			muted: {
				fg: "oklch(0.48 0.02 100)",
				bg: "oklch(0.92 0.01 100)"
			},
			success: {
				fg: "oklch(0.48 0.10 150)",
				bg: "oklch(0.88 0.04 150)"
			}
		}
	},
	playful: {
		name: "playful",
		desc: "低龄段 · 暖色高饱和 · 手绘圆润感",
		palette: {
			primary: {
				fg: "oklch(0.58 0.20 55)",
				bg: "oklch(0.95 0.04 85)"
			},
			accent: {
				fg: "oklch(0.55 0.14 180)",
				bg: "oklch(0.93 0.05 180)"
			},
			danger: {
				fg: "oklch(0.50 0.18 15)",
				bg: "oklch(0.93 0.03 15)"
			},
			warning: {
				fg: "oklch(0.58 0.22 80)",
				bg: "oklch(0.95 0.06 80)"
			},
			info: {
				fg: "oklch(0.50 0.10 240)",
				bg: "oklch(0.93 0.03 240)"
			},
			dim: {
				fg: "oklch(0.55 0.03 85)",
				bg: "oklch(0.96 0.02 85)"
			},
			muted: {
				fg: "oklch(0.55 0.03 85)",
				bg: "oklch(0.96 0.02 85)"
			},
			success: {
				fg: "oklch(0.52 0.16 145)",
				bg: "oklch(0.93 0.05 145)"
			}
		}
	},
	clean: {
		name: "clean",
		desc: "中高年级 · 清晰中性 · 现代教科书风",
		palette: {
			primary: {
				fg: "oklch(0.45 0.12 250)",
				bg: "oklch(0.96 0.01 260)"
			},
			accent: {
				fg: "oklch(0.48 0.12 160)",
				bg: "oklch(0.94 0.03 160)"
			},
			danger: {
				fg: "oklch(0.42 0.15 20)",
				bg: "oklch(0.94 0.02 20)"
			},
			warning: {
				fg: "oklch(0.52 0.18 80)",
				bg: "oklch(0.95 0.05 80)"
			},
			info: {
				fg: "oklch(0.42 0.08 240)",
				bg: "oklch(0.94 0.02 240)"
			},
			dim: {
				fg: "oklch(0.50 0.01 260)",
				bg: "oklch(0.97 0.00 0)"
			},
			muted: {
				fg: "oklch(0.50 0.01 260)",
				bg: "oklch(0.97 0.00 0)"
			},
			success: {
				fg: "oklch(0.45 0.14 150)",
				bg: "oklch(0.94 0.04 150)"
			}
		}
	},
	minimal: {
		name: "minimal",
		desc: "高中以上 · 极简精确 · 学术论文风",
		palette: {
			primary: {
				fg: "oklch(0.25 0.01 260)",
				bg: "oklch(0.94 0.01 90)"
			},
			accent: {
				fg: "oklch(0.40 0.06 250)",
				bg: "oklch(0.92 0.02 250)"
			},
			danger: {
				fg: "oklch(0.35 0.08 20)",
				bg: "oklch(0.92 0.02 20)"
			},
			warning: {
				fg: "oklch(0.48 0.10 80)",
				bg: "oklch(0.93 0.03 80)"
			},
			info: {
				fg: "oklch(0.38 0.05 240)",
				bg: "oklch(0.92 0.02 240)"
			},
			dim: {
				fg: "oklch(0.48 0.01 90)",
				bg: "oklch(0.95 0.01 90)"
			},
			muted: {
				fg: "oklch(0.48 0.01 90)",
				bg: "oklch(0.95 0.01 90)"
			},
			success: {
				fg: "oklch(0.38 0.08 150)",
				bg: "oklch(0.92 0.03 150)"
			}
		}
	},
	sketch: {
		name: "sketch",
		desc: "黑板/草稿风 · 粉笔白+黑板绿 · 手写板书感",
		palette: {
			primary: {
				fg: "oklch(0.85 0.04 100)",
				bg: "oklch(0.28 0.04 160)"
			},
			accent: {
				fg: "oklch(0.75 0.10 180)",
				bg: "oklch(0.24 0.03 180)"
			},
			danger: {
				fg: "oklch(0.72 0.12 30)",
				bg: "oklch(0.24 0.03 30)"
			},
			warning: {
				fg: "oklch(0.78 0.14 80)",
				bg: "oklch(0.26 0.04 80)"
			},
			info: {
				fg: "oklch(0.68 0.08 240)",
				bg: "oklch(0.24 0.03 240)"
			},
			dim: {
				fg: "oklch(0.50 0.03 180)",
				bg: "oklch(0.22 0.02 160)"
			},
			muted: {
				fg: "oklch(0.50 0.03 180)",
				bg: "oklch(0.22 0.02 160)"
			},
			success: {
				fg: "oklch(0.70 0.12 150)",
				bg: "oklch(0.26 0.04 150)"
			}
		}
	}
};
function resolveTheme(name) {
	return themes[name] || themes.warm;
}

//#endregion
export { svgColor as i, themes as n, oklchToHex as r, resolveTheme as t };