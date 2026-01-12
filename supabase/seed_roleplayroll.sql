-- Roleplayroll Seed Data - Run in Supabase SQL Editor
-- Contains roleplay scenarios for practicing soft skills

-- Get category IDs
DO $$
DECLARE
    communication_category_id UUID;
    self_awareness_category_id UUID;
BEGIN
    SELECT id INTO communication_category_id FROM public.soft_skill_categories WHERE slug = 'communication';
    SELECT id INTO self_awareness_category_id FROM public.soft_skill_categories WHERE slug = 'self-awareness';
    
    -- Insert Roleplayroll scenarios
    INSERT INTO public.challenges (feature, type, title, title_en, description, description_en, content, energy_cost, min_level, is_active) VALUES
    
    ('roleplayroll', 'practice', 
     'Wawancara Kerja', 
     'Job Interview',
     'Latihan wawancara kerja dengan HRD virtual.',
     'Practice job interview with virtual HR.',
     '{
       "scenario": {
         "title": "Wawancara Kerja - Posisi Junior Developer",
         "setting": "Ruang meeting kantor startup teknologi",
         "context": "Anda sedang diwawancarai untuk posisi Junior Developer di startup teknologi yang sedang berkembang. Pewawancara adalah Ibu Sarah, HR Manager yang ramah tapi profesional.",
         "your_role": "Kandidat yang sedang melamar posisi Junior Developer",
         "ai_role": "Ibu Sarah, HR Manager"
       },
       "ai_persona": {
         "name": "Ibu Sarah",
         "title": "HR Manager",
         "personality": "Ramah, profesional, menggali potensi kandidat",
         "greeting": "Selamat pagi! Silakan duduk. Saya Sarah dari tim HR. Terima kasih sudah meluangkan waktu untuk wawancara hari ini. Sebelum kita mulai, bisa ceritakan sedikit tentang diri Anda?"
       },
       "conversation_flow": [
         "Perkenalan diri kandidat",
         "Pengalaman dan skill teknis",
         "Kenapa tertarik dengan perusahaan ini",
         "Kekuatan dan kelemahan",
         "Pertanyaan dari kandidat",
         "Penutup"
       ],
       "evaluation_points": [
         "Kejelasan komunikasi",
         "Kepercayaan diri",
         "Relevansi jawaban",
         "Profesionalisme"
       ],
       "min_exchanges": 6,
       "max_exchanges": 12,
       "skill_focus": ["Interview Skills", "Self-presentation", "Confidence"]
     }'::jsonb, 3, 1, true),
    
    ('roleplayroll', 'practice',
     'Negosiasi Gaji',
     'Salary Negotiation',
     'Latihan bernegosiasi gaji dengan atasan.',
     'Practice negotiating salary with your boss.',
     '{
       "scenario": {
         "title": "Negosiasi Gaji Tahunan",
         "setting": "Ruang kerja manager",
         "context": "Sudah 1 tahun Anda bekerja dengan performa baik. Saatnya review tahunan dan Anda ingin meminta kenaikan gaji 20%. Manager Anda, Pak Budi, dikenal fair tapi juga ketat dengan budget.",
         "your_role": "Karyawan yang meminta kenaikan gaji",
         "ai_role": "Pak Budi, Manager"
       },
       "ai_persona": {
         "name": "Pak Budi",
         "title": "Manager",
         "personality": "Fair, analitis, budget-conscious, menghargai data dan fakta",
         "greeting": "Hai, silakan masuk. Jadi ini review tahunan kamu ya. Saya sudah lihat performa kamu setahun ini. Ada yang mau kamu sampaikan?"
       },
       "conversation_flow": [
         "Pembukaan dan menyampaikan maksud",
         "Presentasi pencapaian",
         "Mengajukan angka kenaikan",
         "Menangani penolakan/counter offer",
         "Mencari win-win solution",
         "Kesepakatan akhir"
       ],
       "evaluation_points": [
         "Persiapan data dan fakta",
         "Cara menyampaikan permintaan",
         "Handling objections",
         "Mencapai kesepakatan"
       ],
       "min_exchanges": 6,
       "max_exchanges": 10,
       "skill_focus": ["Negotiation", "Assertiveness", "Professional Communication"]
     }'::jsonb, 3, 2, true),

    ('roleplayroll', 'challenge',
     'Menangani Keluhan Customer',
     'Handling Customer Complaint',
     'Latihan menghadapi customer yang marah.',
     'Practice handling an angry customer.',
     '{
       "scenario": {
         "title": "Customer Service - Keluhan Produk Rusak",
         "setting": "Customer service center via chat",
         "context": "Anda adalah customer service representative. Seorang customer bernama Andi sangat marah karena produk yang dibelinya rusak dan sudah 3x komplain tapi belum terselesaikan.",
         "your_role": "Customer Service Representative",
         "ai_role": "Andi (customer yang marah)"
       },
       "ai_persona": {
         "name": "Andi",
         "title": "Customer",
         "personality": "Frustrasi, marah, tapi bisa tenang jika ditangani dengan baik",
         "greeting": "INI SUDAH KALI KETIGA SAYA KOMPLAIN! Produk rusak dari pertama datang, minta refund tidak diproses, minta ganti tidak jelas. Kalian ini gimana sih?!"
       },
       "conversation_flow": [
         "Menerima keluhan dengan empati",
         "Tidak defensif, mengakui masalah",
         "Mencari akar masalah",
         "Menawarkan solusi konkret",
         "Memastikan customer puas",
         "Follow up plan"
       ],
       "evaluation_points": [
         "Empati dan kesabaran",
         "De-escalation technique",
         "Problem solving",
         "Customer satisfaction"
       ],
       "min_exchanges": 6,
       "max_exchanges": 10,
       "skill_focus": ["Customer Service", "Conflict Resolution", "Empathy"]
     }'::jsonb, 3, 2, true),

    ('roleplayroll', 'challenge',
     'Presentasi ke Stakeholder',
     'Stakeholder Presentation',
     'Latihan meyakinkan investor atau stakeholder.',
     'Practice convincing investors or stakeholders.',
     '{
       "scenario": {
         "title": "Pitch ke Investor",
         "setting": "Ruang meeting dengan investor potensial",
         "context": "Anda mempresentasikan startup Anda ke investor angel. Pak Dharma adalah investor berpengalaman yang kritis dan langsung ke poin. Anda butuh funding 500 juta untuk 10% equity.",
         "your_role": "Founder startup",
         "ai_role": "Pak Dharma, Angel Investor"
       },
       "ai_persona": {
         "name": "Pak Dharma",
         "title": "Angel Investor",
         "personality": "Kritis, analitis, to the point, mencari startup yang scalable",
         "greeting": "Oke, saya punya waktu 15 menit. Langsung saja, apa yang membuat startup kamu berbeda dari kompetitor?"
       },
       "conversation_flow": [
         "Value proposition",
         "Market size dan problem",
         "Solution dan traction",
         "Business model",
         "Funding ask dan use of funds",
         "Q&A dan closing"
       ],
       "evaluation_points": [
         "Clarity of pitch",
         "Handling tough questions",
         "Data-driven answers",
         "Confidence under pressure"
       ],
       "min_exchanges": 6,
       "max_exchanges": 12,
       "skill_focus": ["Pitching", "Persuasion", "Confidence Under Pressure"]
     }'::jsonb, 3, 3, true);

    -- Link to communication category
    INSERT INTO public.challenge_skill_weights (challenge_id, category_id, weight)
    SELECT c.id, communication_category_id, 0.7
    FROM public.challenges c
    WHERE c.feature = 'roleplayroll' AND NOT EXISTS (
        SELECT 1 FROM public.challenge_skill_weights csw 
        WHERE csw.challenge_id = c.id AND csw.category_id = communication_category_id
    );

    -- Also link to self-awareness
    INSERT INTO public.challenge_skill_weights (challenge_id, category_id, weight)
    SELECT c.id, self_awareness_category_id, 0.3
    FROM public.challenges c
    WHERE c.feature = 'roleplayroll' AND NOT EXISTS (
        SELECT 1 FROM public.challenge_skill_weights csw 
        WHERE csw.challenge_id = c.id AND csw.category_id = self_awareness_category_id
    );

END $$;
