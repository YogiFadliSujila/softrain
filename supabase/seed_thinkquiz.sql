-- Critical Thinkquiz Seed Data - Run in Supabase SQL Editor
-- Contains logic puzzles, pattern recognition, and critical thinking challenges

-- Get the "Berpikir Kritis" category ID
DO $$
DECLARE
    critical_category_id UUID;
BEGIN
    SELECT id INTO critical_category_id FROM public.soft_skill_categories WHERE slug = 'critical-thinking';
    
    -- Insert Thinkquiz challenges
    INSERT INTO public.challenges (feature, type, title, title_en, description, description_en, content, energy_cost, min_level, is_active) VALUES
    
    ('thinkquiz', 'practice', 
     'Pola Angka', 
     'Number Pattern',
     'Temukan angka berikutnya dalam deret.',
     'Find the next number in the sequence.',
     '{
       "puzzle_type": "sequence",
       "question": "Temukan angka berikutnya dalam deret ini:",
       "sequence": "2, 6, 12, 20, 30, ?",
       "options": [
         {"id": "A", "text": "40", "is_correct": false, "explanation": "Bukan 40. Perhatikan pola selisih antar angka."},
         {"id": "B", "text": "42", "is_correct": true, "explanation": "Benar! Selisihnya: 4, 6, 8, 10, 12. Pola +2 pada setiap selisih."},
         {"id": "C", "text": "44", "is_correct": false, "explanation": "Bukan 44. Coba hitung selisih antar angka berurutan."},
         {"id": "D", "text": "36", "is_correct": false, "explanation": "Bukan 36. Selisihnya bertambah, bukan tetap."}
       ],
       "hint": "Perhatikan selisih antar angka berurutan. Apakah ada pola?",
       "explanation": "Deret ini mengikuti pola n(n+1): 1×2=2, 2×3=6, 3×4=12, 4×5=20, 5×6=30, 6×7=42",
       "skill_focus": ["Pattern Recognition", "Mathematical Reasoning"]
     }'::jsonb, 1, 1, true),
    
    ('thinkquiz', 'practice',
     'Silogisme Logika',
     'Logic Syllogism',
     'Evaluasi kesimpulan dari premis yang diberikan.',
     'Evaluate the conclusion from given premises.',
     '{
       "puzzle_type": "logic",
       "question": "Perhatikan premis berikut dan tentukan kesimpulan yang valid:",
       "premises": [
         "Semua kucing adalah hewan berbulu.",
         "Beberapa hewan berbulu adalah peliharaan yang baik."
       ],
       "options": [
         {"id": "A", "text": "Semua kucing adalah peliharaan yang baik", "is_correct": false, "explanation": "Salah! Premis hanya mengatakan ''beberapa'' hewan berbulu, bukan semua."},
         {"id": "B", "text": "Beberapa peliharaan yang baik adalah kucing", "is_correct": false, "explanation": "Tidak dapat disimpulkan. Tidak ada hubungan langsung yang pasti."},
         {"id": "C", "text": "Tidak ada kesimpulan pasti yang dapat ditarik", "is_correct": true, "explanation": "Benar! Dengan ''beberapa'' di premis kedua, kita tidak bisa menyimpulkan hubungan pasti antara kucing dan peliharaan yang baik."},
         {"id": "D", "text": "Tidak ada kucing yang peliharaan yang baik", "is_correct": false, "explanation": "Salah! Premis tidak mengatakan demikian, hanya tidak bisa dipastikan."}
       ],
       "hint": "Kata ''beberapa'' dalam logika tidak menjamin hubungan menyeluruh.",
       "explanation": "Dalam silogisme, kuantor ''beberapa'' tidak cukup untuk menarik kesimpulan universal. Mungkin ada irisan, mungkin tidak - kita tidak bisa memastikan.",
       "skill_focus": ["Logical Reasoning", "Syllogism Analysis"]
     }'::jsonb, 1, 1, true),
    
    ('thinkquiz', 'practice',
     'Analogi Verbal',
     'Verbal Analogy',
     'Temukan hubungan antar kata.',
     'Find the relationship between words.',
     '{
       "puzzle_type": "analogy",
       "question": "Lengkapi analogi berikut:",
       "analogy": "Dokter : Pasien :: Guru : ?",
       "options": [
         {"id": "A", "text": "Sekolah", "is_correct": false, "explanation": "Sekolah adalah tempat, bukan subjek yang dilayani."},
         {"id": "B", "text": "Buku", "is_correct": false, "explanation": "Buku adalah alat, bukan subjek yang dilayani."},
         {"id": "C", "text": "Murid", "is_correct": true, "explanation": "Benar! Dokter melayani Pasien, Guru melayani Murid."},
         {"id": "D", "text": "Pelajaran", "is_correct": false, "explanation": "Pelajaran adalah materi, bukan subjek yang dilayani."}
       ],
       "hint": "Pikirkan siapa yang dilayani oleh profesi tersebut.",
       "explanation": "Pola analogi: [Profesi] melayani [Subjek yang dilayani]. Dokter melayani pasien, guru melayani murid.",
       "skill_focus": ["Verbal Reasoning", "Relationship Analysis"]
     }'::jsonb, 1, 1, true),

    ('thinkquiz', 'challenge',
     'Paradoks Logika',
     'Logic Paradox',
     'Analisis argumen yang tampak kontradiktif.',
     'Analyze arguments that appear contradictory.',
     '{
       "puzzle_type": "paradox",
       "question": "Seorang pria berkata: ''Pernyataan ini adalah kebohongan.'' Mana analisis yang paling tepat?",
       "context": "Ini adalah versi sederhana dari Paradoks Pembohong (Liars Paradox) yang terkenal dalam filsafat.",
       "options": [
         {"id": "A", "text": "Pernyataan tersebut benar", "is_correct": false, "explanation": "Jika benar, maka isinya benar (bahwa itu kebohongan), jadi seharusnya salah. Kontradiksi!"},
         {"id": "B", "text": "Pernyataan tersebut salah", "is_correct": false, "explanation": "Jika salah, maka isinya salah (bukan kebohongan = kebenaran), jadi seharusnya benar. Kontradiksi!"},
         {"id": "C", "text": "Pernyataan tersebut adalah paradoks yang tidak dapat dinilai benar/salah", "is_correct": true, "explanation": "Benar! Ini adalah paradoks self-reference yang tidak memiliki nilai kebenaran yang konsisten."},
         {"id": "D", "text": "Pernyataan tersebut tidak bermakna", "is_correct": false, "explanation": "Pernyataan ini bermakna secara gramatikal, hanya saja menciptakan kontradiksi logis."}
       ],
       "hint": "Coba evaluasi kedua kemungkinan (benar dan salah) dan lihat apa yang terjadi.",
       "explanation": "Paradoks Pembohong menunjukkan batasan logika klasik dalam menangani pernyataan self-referential. Ini bukan soal benar/salah, tapi tentang mengenali struktur paradoks.",
       "skill_focus": ["Paradox Recognition", "Meta-logical Thinking"]
     }'::jsonb, 2, 2, true),

    ('thinkquiz', 'challenge',
     'Bias Kognitif',
     'Cognitive Bias',
     'Identifikasi kekeliruan dalam penalaran.',
     'Identify fallacies in reasoning.',
     '{
       "puzzle_type": "fallacy",
       "question": "Identifikasi jenis kekeliruan (fallacy) dalam argumen berikut:",
       "argument": "''Jutaan orang percaya bahwa produk ini efektif. Tidak mungkin jutaan orang salah, jadi produk ini pasti benar-benar efektif.''",
       "options": [
         {"id": "A", "text": "Ad Hominem", "is_correct": false, "explanation": "Ad Hominem menyerang pribadi, bukan argumen. Ini bukan kasusnya di sini."},
         {"id": "B", "text": "Appeal to Popularity (Argumentum ad Populum)", "is_correct": true, "explanation": "Benar! Mengklaim sesuatu benar hanya karena banyak orang percaya adalah kekeliruan Ad Populum."},
         {"id": "C", "text": "Straw Man", "is_correct": false, "explanation": "Straw Man mendistorsi argumen lawan. Tidak ada argumen lawan yang didistorsi di sini."},
         {"id": "D", "text": "False Dichotomy", "is_correct": false, "explanation": "False Dichotomy menyajikan pilihan palsu. Argumen ini tidak menyajikan pilihan."}
       ],
       "hint": "Apakah jumlah orang yang percaya sesuatu menjadikannya benar?",
       "explanation": "Appeal to Popularity adalah kekeliruan karena kebenaran tidak ditentukan oleh popularitas. Dahulu jutaan orang percaya bumi datar - tetap saja salah.",
       "skill_focus": ["Fallacy Detection", "Critical Analysis"]
     }'::jsonb, 2, 2, true);

    -- Link challenges to critical-thinking category
    INSERT INTO public.challenge_skill_weights (challenge_id, category_id, weight)
    SELECT c.id, critical_category_id, 1.0
    FROM public.challenges c
    WHERE c.feature = 'thinkquiz' AND NOT EXISTS (
        SELECT 1 FROM public.challenge_skill_weights csw 
        WHERE csw.challenge_id = c.id AND csw.category_id = critical_category_id
    );

END $$;
