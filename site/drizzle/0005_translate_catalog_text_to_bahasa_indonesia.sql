UPDATE `projects` SET
  `status_label` = 'Periode 14 dibuka — Periode 15 terakhir berakhir 9 Nov',
  `description` = 'NFT identitas Proof of Agent (POA, soulbound). Pemegangnya mengikuti undian hadiah PTAH harian dengan memposting kartu mereka di Binance Square atau X setiap periode. Satu mint gratis per Agent ID; mint gratis ditutup 8 Nov 04:44 UTC.',
  `reward_note` = 'Undian Periode 13 (7 Nov): 500 pemenang × 3,988.9 PTAH masing-masing, dari hasil undian resmi Ptah.',
  `verified_note` = 'Di-mint dan diverifikasi ulang dengan wallet pengguna (Agent #43494). Jendela periode dan hasil undian dibaca dari API resmi Ptah pada 7 Nov 2026.'
WHERE `name` = 'Ptah — Proof of Agent';
--> statement-breakpoint
UPDATE `projects` SET
  `status_label` = 'Kartu pertama gratis',
  `description` = 'NFT oracle / ramalan untuk pemegang .ai Agent ID: 20,000 kartu dalam empat tingkatan (Jade, Silver, Gold, Dragon), maksimal 30 per wallet. Proyek komunitas independen — situs resminya sendiri menyatakan tidak berafiliasi dengan atau didukung oleh Binance.',
  `verified_note` = 'Situs dan kontrak dibaca pada 2 Nov 2026 (6,286 / 20,000 sudah di-mint saat pemeriksaan); pratinjau mint(1) gratis tersimulasikan dengan bersih. Belum di-mint — eksekusinya terhalang galat saldo gas, tidak ada dana yang hilang.'
WHERE `name` = 'BAOracle — Binance Agent Oracle';
--> statement-breakpoint
UPDATE `projects` SET
  `status_label` = 'Ronde klaim gratis untuk .ai Agent ID',
  `description` = 'Klaim token SAFU gratis untuk .ai Agent ID paling awal, dirilis dalam ronde-ronde (Ronde 3 mencakup ID 10,001–15,000). Klaim gratis ini terpisah dari penjualan berbayar buyLots.',
  `reward_note` = 'Tingkatan gratis yang diumumkan proyek: 45B SAFU untuk 50,000 Agent ID paling awal. Klaim sebesar 969,696.9697 SAFU terkonfirmasi di wallet pengguna pada 31 Okt 2026.',
  `verified_note` = 'claimFree() dieksekusi dengan wallet pengguna pada 31 Okt 2026; saldo SAFU terkonfirmasi on-chain.'
WHERE `name` = 'SAFU — SafuAgent';
--> statement-breakpoint
UPDATE `projects` SET
  `status_label` = 'Mao pertama gratis per Agent ID',
  `description` = 'Token agen berbasis saham: 1 Mao = 1 saham = 1,000,000 MAOAI. Mao pertama untuk setiap .ai Agent ID gratis (hanya gas); Mao berikutnya berbayar dan tidak dilacak di sini.',
  `reward_note` = 'Mao gratis pertama terkonfirmasi di wallet pengguna pada 1 Nov 2026: 1,000,000 MAOAI diterima.',
  `verified_note` = 'quote(1, agentId) = 0 terkonfirmasi on-chain dan mint dieksekusi 1 Nov 2026; saldo MAOAI terverifikasi.'
WHERE `name` = 'Agent Mao';
--> statement-breakpoint
UPDATE `projects` SET
  `status_label` = 'Kartu pertama gratis (1 dari 5)',
  `description` = 'Koleksi kartu dengan kartu pertama berupa mint gratis metode USDT; kartu 2–5 berbayar dan tidak dilacak di sini.',
  `reward_note` = 'Kartu pertama gratis di-mint dengan wallet pengguna pada 31 Okt 2026 (tokenId 4878).',
  `verified_note` = 'Pratinjau mint gratis tersimulasikan +1 NFT dan eksekusinya tercatat on-chain 31 Okt 2026; sisa kuota 4/5 berbayar.'
WHERE `name` = 'Mars Nexus';
--> statement-breakpoint
UPDATE `projects` SET
  `status_label` = 'Papan aktif — mint memerlukan voucher dari backend',
  `description` = 'Launchpad agentic di Robinhood Chain (chain 4663), tidak berafiliasi dengan Binance. Dokumentasinya menyatakan mint pertama per wallet gratis, lalu berbayar dengan harga yang ditetapkan kreator — tetapi minting memerlukan voucher EIP-712 dari backend proyek ditambah SPACE ID Agent ID yang soulbound, jadi belum ada mint publik langsung.',
  `verified_note` = 'Papan dan kontrak dibaca dari README GitHub resmi proyek pada 2 Nov 2026 (13 token terdaftar, 12 aktif). Tidak ada mint yang dieksekusi — jalur voucher memerlukan keputusan terpisah.'
WHERE `name` = 'SoulBoard';
--> statement-breakpoint
UPDATE `projects` SET
  `status_label` = 'Mint gratis selesai 1 Nov',
  `description` = 'Koleksi NFT bertema benih di BNB Chain dengan jalur mint gratis yang terverifikasi on-chain pada awal November.',
  `reward_note` = 'Dua NFT GSEED dari mint gratis terkonfirmasi di wallet pengguna pada 1 Nov 2026.',
  `verified_note` = 'mint(2) dengan nilai 0 dieksekusi 1 Nov 2026; tokenId 9519 dan 9520 terkonfirmasi di wallet pengguna.'
WHERE `name` = 'Genesis Seeds';
--> statement-breakpoint
UPDATE `projects` SET
  `status_label` = 'Mint gratis selesai 1 Nov',
  `description` = 'Koleksi NFT bertema agen di BNB Chain dengan mint pertama gratis yang terverifikasi on-chain pada awal November.',
  `reward_note` = 'Satu NFT NIGHT dari mint gratis terkonfirmasi di wallet pengguna pada 1 Nov 2026.',
  `verified_note` = 'mint(1) dengan nilai 0 dieksekusi 1 Nov 2026; tokenId 8065 terkonfirmasi di wallet pengguna.'
WHERE `name` = 'Night Shift Agents';
--> statement-breakpoint
UPDATE `projects` SET
  `status_label` = 'Mint pertama gratis selesai 1 Nov',
  `description` = 'Koleksi NFT agen di BNB Chain. Mint pertama per wallet gratis; mint berikutnya berharga 0.00067 BNB masing-masing dan berada di luar kebijakan khusus gratis.',
  `reward_note` = 'Satu NFT Cogito dari mint gratis terkonfirmasi di wallet pengguna pada 1 Nov 2026.',
  `verified_note` = 'mint(1) dengan nilai 0 dieksekusi 1 Nov 2026; tokenId 1347 terkonfirmasi di wallet pengguna.'
WHERE `name` = 'Cogito Agents';
--> statement-breakpoint
UPDATE `projects` SET
  `status_label` = 'Petak gratis diklaim 31 Okt',
  `description` = 'NFT petak tanah di Mars: satu petak acak gratis per wallet; memilih petak tertentu atau Starter Pack berbayar. Proyek komunitas, tidak berafiliasi dengan Binance, BNB Chain, atau SPACE ID.',
  `reward_note` = 'Satu PLOT gratis (tokenId 3397) terkonfirmasi di wallet pengguna pada 31 Okt 2026.',
  `verified_note` = 'Mint gratis (0, false) tercatat on-chain 31 Okt 2026; hasMinted terkonfirmasi untuk wallet pengguna.'
WHERE `name` = 'Mars Plots';
--> statement-breakpoint
UPDATE `projects` SET
  `status_label` = 'Masa gratis berakhir 4 Nov',
  `description` = 'Koleksi NFT naga yang naga pertamanya gratis untuk pemegang .ai Agent ID selama periode 28 Okt – 4 Nov; naga tambahan berbayar.',
  `reward_note` = 'Satu Pocket Dragon gratis (tokenId 6498) terkonfirmasi di wallet pengguna pada 31 Okt 2026.',
  `verified_note` = 'Mint(1) gratis dengan nilai 0 dieksekusi 31 Okt 2026 dalam periode yang diumumkan.'
WHERE `name` = 'Pocket Dragons';
--> statement-breakpoint
UPDATE `projects` SET
  `status_label` = 'Fase gratis berakhir — sekarang berbayar',
  `description` = 'Koleksi yang 7,000 token pertamanya merupakan fase gratis. Pasokan on-chain sudah melewati batas itu, dan fase saat ini mengenakan sekitar $1 per token — di luar kebijakan khusus gratis, jadi tetap terdaftar sebagai berakhir, bukan aktif.',
  `verified_note` = 'Dicek ulang on-chain 2 Nov 2026: totalSupply 7,032 / 10,000, sudah melewati batas gratis; panggilan mint gratis gagal (revert). Tampilan ''first 2 free'' di situs proyek bertentangan dengan data rantai dan tidak dipercaya di sini.'
WHERE `name` = 'Pixel';
