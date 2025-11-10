"use client";

import * as React from "react";
import {Button} from "@/components/ui/button";
import {useEffect} from "react";

type Rarity = "Common" | "Uncommon" | "Rare" | "Legendary" | "Mythic";

const rarityColorVar: Record<Rarity, string> = {
	Common: "--chart-1",
	Uncommon: "--chart-2",
	Rare: "--chart-3",
	Legendary: "--chart-4",
	Mythic: "--chart-5",
};

type Meme = {
	year: number;
	age: string,
	rarity: Rarity | string;
	link: string;
};

type Entry = {
	title: string;
	data: Meme;
};

const SEEN_KEY = "gn_seen_v1";

function parseYouTubeId(url: string): string | null {
	try {
		const new_url: URL = new URL(url);
		if ((new_url.hostname.includes("youtube.com") || new_url.hostname.includes("www.youtube.com"))) {
			if (new_url.pathname.startsWith("/watch")) {
				return new_url.searchParams.get("v");
			}

			const parts = new_url.pathname.split("/").filter(Boolean);
			// handle case of shorts url and other stuff in case I paste something weird
			if (parts.length >= 2 && (parts[0] === "shorts" || parts[0] === "embed")) {
				return parts[1];
			}
		}
		return null;
	} catch {
		return null;
	}
}

function toEmbedUrl(url: string): string {
	const id = parseYouTubeId(url);
	return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : url;
}

export default function Home() {
	const [memes, setMemes] = React.useState<Entry[]>([]);
	const [current, setCurrent] = React.useState<Entry | null>(null);
	const [seen, setSeen] = React.useState<Set<string>>(new Set());

	function pickRandomUnseen(list: Entry[], seenSet: Set<string>): Entry | null {
		const pool = list.filter((m) => !seenSet.has(m.title));
		if (pool.length === 0) return null;
		const idx = Math.floor(Math.random() * pool.length);
		return pool[idx];
	}

	function roll() {
		const next = pickRandomUnseen(memes, seen);
		if (!next) {
			alert("You've seen them all! Reset to start over.");
			return;
		}
		setCurrent(next);
		setSeen((prev) => new Set(prev).add(next.title));
	}

	function resetProgress() {
		setSeen(new Set());
		const fresh = pickRandomUnseen(memes, new Set());
		setCurrent(fresh ?? null);
		if (fresh) setSeen(new Set([fresh.title]));
	}

	useEffect(() => {
		const raw = localStorage.getItem(SEEN_KEY);
		if (raw) {
			const arr: string[] = JSON.parse(raw);
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setSeen(new Set(arr));
		}
	}, [])

	useEffect(() => {
		localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
	}, [seen]);

	useEffect(() => {
		let cancelled = false;
		(async() => {
			const result = await fetch("/list/classed.json", { cache: "no-store" });
			const object = (await result.json()) as Record<string, Meme>;
			const list: Entry[] = Object.entries(object).map(([title, data]) => ({
				title,
				data,
			}));

			if (!cancelled) {
				setMemes(list);
				if (!current) {
					const next = pickRandomUnseen(list, seen);
					setCurrent(next);
					if (next) setSeen((prev) => new Set(prev).add(next.title));
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [current, seen]);

	const total = memes.length;
	const collected = seen.size;
	const progress = total > 0 ? Math.round((collected / total) * 100) : 0;


	return (
		<div className="text-zinc-100 flex flex-col items-center justify-center px-4">
			<h1 className="text-4xl mt-24 font-bold">Gambling for Memes</h1>

			<div className="mt-6 text-sm text-zinc-400">
				<span>Collected: {collected}/{total}</span>
				<span className="mx-2">---</span>
				<span>{progress}% complete</span>
			</div>

			<div className="mt-10 w-full max-w-2xl rounded-2xl bg-zinc-900/50 border border-zinc-800 shadow-lg p-5">
				{current ? (
					<>
						<div className="text-lg font-semibold text-zinc-100">{current.title}</div>

						<div className="mt-4 flex flex-row gap-2 text-sm">
							<div className="text-zinc-400">Year</div>
							<div className="font-medium text-zinc-100">{current.data.year}</div>

							<div className="text-zinc-400">Age</div>
							<div className="font-medium text-zinc-100">{current.data.age}</div>

							<div className="text-zinc-400">Rarity</div>
							<div
								className="font-medium"
								style={{
									color: `var(${rarityColorVar[(current.data.rarity as Rarity)] ?? "--foreground"})`,
								}}
							>
								{current.data.rarity}
							</div>
						</div>

						<div className="mt-4 aspect-video w-full overflow-hidden rounded-xl border border-zinc-800">
							<iframe
								className="w-full h-full"
								src={toEmbedUrl(current.data.link)}
								title={current.title}
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								allowFullScreen
							/>
						</div>
					</>
				) : (
					<div className="text-center text-zinc-400 py-16">
						Loading your roll...
					</div>
				)}
			</div>

			<div className="mt-8 flex gap-3">
				<Button className="hover:bg-zinc-700" variant="default" onClick={roll}>
					Roll
				</Button>
				<Button className="bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-100" variant="outline" onClick={resetProgress}>
					Reset
				</Button>
			</div>

			<div className="mt-6 max-w-2xl text-xs text-zinc-500 text-center">
				{collected > 0 && (
					<div>
						Seen so far: {[...seen].slice(0, 10).join(", ")}
						{seen.size > 10 ? "..." : ""}
					</div>
				)}
			</div>
		</div>
	);
}
