-- Speaktrain Seed Data - Run in Supabase SQL Editor
-- Contains speech practice topics with prompts

-- Get the "Komunikasi" category ID
DO $$
DECLARE
    communication_category_id UUID;
BEGIN
    SELECT id INTO communication_category_id FROM public.soft_skill_categories WHERE slug = 'communication';
    
    -- Insert Speaktrain challenges
    INSERT INTO public.challenges (feature, type, title, title_en, description, description_en, content, energy_cost, min_level, is_active) VALUES
    
    ('speaktrain', 'practice', 
     'Perkenalan Diri', 
     'Self Introduction',
     'Latihan memperkenalkan diri secara profesional dalam 1 menit.',
     'Practice introducing yourself professionally in 1 minute.',
     '{
       "topic": "Perkenalan Diri Profesional",
       "duration_seconds": 60,
       "prompt": "Perkenalkan diri Anda secara profesional. Sebutkan nama, latar belakang pendidikan atau pekerjaan, kemampuan utama Anda, dan apa yang sedang Anda kerjakan atau pelajari saat ini.",
       "tips": [
         "Mulai dengan salam dan nama Anda",
         "Sebutkan latar belakang singkat",
         "Highlight 2-3 kemampuan utama",
         "Tutup dengan apa yang Anda cari atau goals Anda"
       ],
       "example": "Selamat pagi, nama saya Budi Santoso. Saya alumni Teknik Informatika dengan pengalaman 3 tahun di bidang web development. Keahlian utama saya adalah React dan Node.js. Saat ini saya sedang mengembangkan kemampuan leadership dan mencari peluang untuk memimpin tim engineering.",
       "evaluation_criteria": {
         "min_words": 50,
         "max_duration": 90,
         "key_elements": ["nama", "latar belakang", "kemampuan", "tujuan"]
       },
       "skill_focus": ["Public Speaking", "Self-presentation", "Confidence"]
     }'::jsonb, 2, 1, true),
    
    ('speaktrain', 'practice',
     'Elevator Pitch',
     'Elevator Pitch',
     'Sampaikan ide atau produk Anda dalam 30 detik.',
     'Present your idea or product in 30 seconds.',
     '{
       "topic": "Elevator Pitch",
       "duration_seconds": 30,
       "prompt": "Bayangkan Anda bertemu investor di lift dan hanya punya 30 detik. Jelaskan ide startup, proyek, atau solusi Anda dengan singkat dan menarik.",
       "tips": [
         "Hook yang menarik di awal",
         "Masalah yang dipecahkan",
         "Solusi Anda dalam satu kalimat",
         "Ajakan untuk tindak lanjut"
       ],
       "example": "Pernahkah Anda kesulitan mencari mentor yang tepat? Kami membangun MentorMatch, platform AI yang menghubungkan profesional muda dengan mentor terverifikasi. Dalam 3 bulan, kami sudah memfasilitasi 500 sesi mentoring. Tertarik untuk berdiskusi lebih lanjut?",
       "evaluation_criteria": {
         "min_words": 30,
         "max_duration": 45,
         "key_elements": ["masalah", "solusi", "pencapaian"]
       },
       "skill_focus": ["Persuasion", "Conciseness", "Confidence"]
     }'::jsonb, 1, 1, true),

    ('speaktrain', 'practice',
     'Menyampaikan Pendapat',
     'Expressing Opinion',
     'Latihan menyampaikan pendapat dengan struktur yang jelas.',
     'Practice expressing opinions with clear structure.',
     '{
       "topic": "Menyampaikan Pendapat",
       "duration_seconds": 90,
       "prompt": "Pilih salah satu topik: (1) Apakah WFH lebih produktif dari WFO? (2) Apakah AI akan menggantikan pekerjaan manusia? Sampaikan pendapat Anda dengan alasan yang jelas.",
       "tips": [
         "Gunakan struktur: Pendapat → Alasan → Contoh → Kesimpulan",
         "Berikan 2-3 alasan pendukung",
         "Sertakan contoh konkret",
         "Akui sisi lain namun jelaskan posisi Anda"
       ],
       "example": "Menurut saya, WFH dan WFO sama-sama memiliki kelebihan tergantung jenis pekerjaannya. Untuk pekerjaan yang membutuhkan fokus individu seperti coding, WFH lebih produktif. Namun untuk brainstorming dan team building, WFO lebih efektif. Yang terpenting adalah fleksibilitas dan trust dari perusahaan.",
       "evaluation_criteria": {
         "min_words": 80,
         "max_duration": 120,
         "key_elements": ["pendapat", "alasan", "contoh"]
       },
       "skill_focus": ["Argumentation", "Critical Thinking", "Public Speaking"]
     }'::jsonb, 2, 1, true),

    ('speaktrain', 'challenge',
     'Presentasi Tanpa Persiapan',
     'Impromptu Speech',
     'Berbicara spontan tentang topik acak selama 2 menit.',
     'Speak spontaneously about a random topic for 2 minutes.',
     '{
       "topic": "Impromptu Speech",
       "duration_seconds": 120,
       "random_topics": [
         "Pelajaran terpenting yang saya dapat tahun ini",
         "Jika saya bisa mengubah satu hal di dunia",
         "Skill yang ingin saya kuasai dan alasannya",
         "Mentor atau tokoh yang paling menginspirasi saya",
         "Kesalahan terbesar yang menjadi pelajaran berharga"
       ],
       "prompt": "Anda akan mendapat topik acak. Tanpa persiapan, bicarakan topik tersebut selama 2 menit. Latihan ini melatih kemampuan berpikir cepat dan berbicara terstruktur.",
       "tips": [
         "Ambil nafas dan pikirkan struktur singkat (3-5 detik)",
         "Buat pembukaan yang menarik",
         "Kembangkan 2-3 poin utama",
         "Gunakan contoh personal jika memungkinkan",
         "Akhiri dengan kesimpulan yang kuat"
       ],
       "evaluation_criteria": {
         "min_words": 100,
         "max_duration": 150,
         "key_elements": ["pembukaan", "isi", "kesimpulan"]
       },
       "skill_focus": ["Impromptu Speaking", "Quick Thinking", "Confidence"]
     }'::jsonb, 3, 2, true);

    -- Link challenges to communication category
    INSERT INTO public.challenge_skill_weights (challenge_id, category_id, weight)
    SELECT c.id, communication_category_id, 1.0
    FROM public.challenges c
    WHERE c.feature = 'speaktrain' AND NOT EXISTS (
        SELECT 1 FROM public.challenge_skill_weights csw 
        WHERE csw.challenge_id = c.id AND csw.category_id = communication_category_id
    );

END $$;
