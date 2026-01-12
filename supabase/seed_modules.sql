-- Learning Modules Seed Data - Run in Supabase SQL Editor
-- Contains 3 structured learning modules for soft skills development

-- Get category IDs
DO $$
DECLARE
    communication_id UUID;
    self_awareness_id UUID;
    emotional_id UUID;
BEGIN
    SELECT id INTO communication_id FROM public.soft_skill_categories WHERE slug = 'communication';
    SELECT id INTO self_awareness_id FROM public.soft_skill_categories WHERE slug = 'self-awareness';
    SELECT id INTO emotional_id FROM public.soft_skill_categories WHERE slug = 'emotional-management';
    
    -- Module 1: Komunikasi Efektif
    INSERT INTO public.modules (title, title_en, description, description_en, content, min_level, max_level, category_id, order_index, is_active) VALUES
    (
        'Dasar Komunikasi Efektif',
        'Fundamentals of Effective Communication',
        'Pelajari prinsip dasar komunikasi yang baik untuk meningkatkan hubungan profesional dan personal.',
        'Learn fundamental principles of good communication to improve professional and personal relationships.',
        '{
          "sections": [
            {
              "title": "Pengantar",
              "type": "text",
              "content": "Komunikasi adalah fondasi dari semua hubungan. Penelitian menunjukkan bahwa 85% kesuksesan karir ditentukan oleh kemampuan soft skills, terutama komunikasi. Modul ini akan mengajarkan Anda prinsip-prinsip dasar untuk berkomunikasi dengan lebih efektif."
            },
            {
              "title": "Komponen Komunikasi",
              "type": "text",
              "content": "Setiap komunikasi memiliki 3 komponen utama:\n\n**1. Verbal (7%)**\nKata-kata yang Anda gunakan. Pilih kata yang jelas dan sesuai konteks.\n\n**2. Vokal (38%)**\nNada suara, kecepatan, dan intonasi. Bagaimana Anda mengatakannya sama pentingnya dengan apa yang Anda katakan.\n\n**3. Visual (55%)**\nBahasa tubuh, ekspresi wajah, dan kontak mata. Ini adalah bagian terbesar dari komunikasi."
            },
            {
              "title": "Prinsip 3C Komunikasi",
              "type": "text",
              "content": "Untuk komunikasi yang efektif, ingat formula 3C:\n\n**Clear (Jelas)**\nSampaikan pesan dengan jelas. Hindari jargon yang tidak diperlukan.\n\n**Concise (Ringkas)**\nSampaikan inti pesan tanpa bertele-tele. Hargai waktu lawan bicara.\n\n**Courteous (Sopan)**\nGunakan bahasa yang sopan dan hormat. Pertimbangkan perasaan lawan bicara."
            },
            {
              "title": "Latihan: Active Listening",
              "type": "exercise",
              "content": "Praktikkan teknik mendengarkan aktif:\n\n1. **Fokus penuh** - Singkirkan gadget dan gangguan\n2. **Tunjukkan bahwa Anda mendengarkan** - Anggukan, kontak mata\n3. **Berikan feedback** - \"Hmm\", \"Saya mengerti\"\n4. **Jangan menyela** - Biarkan lawan bicara menyelesaikan\n5. **Rangkum** - \"Jadi yang Anda maksud adalah...\"\n\nCoba praktikkan ini dalam percakapan hari ini!"
            },
            {
              "title": "Ringkasan",
              "type": "summary",
              "content": "Poin penting dari modul ini:\n• Komunikasi = 7% verbal + 38% vokal + 55% visual\n• Gunakan prinsip 3C: Clear, Concise, Courteous\n• Active listening adalah kunci komunikasi dua arah yang efektif",
              "key_takeaways": [
                "Komunikasi bukan hanya tentang berbicara, tapi juga mendengarkan",
                "Bahasa tubuh menyampaikan lebih banyak dari kata-kata",
                "Kejelasan dan kesopanan adalah fondasi komunikasi yang baik"
              ]
            }
          ],
          "estimated_duration": 15,
          "xp_reward": 25,
          "quiz": {
            "questions": [
              {
                "question": "Berapa persen komunikasi yang disampaikan melalui bahasa tubuh?",
                "options": ["7%", "38%", "55%", "100%"],
                "correct": 2
              },
              {
                "question": "Apa kepanjangan dari prinsip 3C?",
                "options": ["Clear, Calm, Confident", "Clear, Concise, Courteous", "Calm, Confident, Caring", "Creative, Critical, Careful"],
                "correct": 1
              }
            ]
          }
        }'::jsonb, 1, 20, communication_id, 1, true
    ),
    
    -- Module 2: Kesadaran Diri
    (
        'Mengenal Diri Sendiri',
        'Understanding Yourself',
        'Pelajari teknik introspeksi untuk memahami kekuatan, kelemahan, nilai, dan motivasi Anda.',
        'Learn introspection techniques to understand your strengths, weaknesses, values, and motivations.',
        '{
          "sections": [
            {
              "title": "Mengapa Kesadaran Diri Penting",
              "type": "text",
              "content": "Kesadaran diri (self-awareness) adalah kemampuan untuk memahami emosi, pikiran, dan perilaku diri sendiri. Orang dengan kesadaran diri tinggi cenderung:\n\n• Membuat keputusan yang lebih baik\n• Memiliki hubungan yang lebih sehat\n• Lebih sukses dalam karir\n• Lebih resilient terhadap stres\n\nMenurut penelitian Hay Group, 95% orang merasa sadar diri, tapi hanya 10-15% yang benar-benar memiliki kesadaran diri yang baik."
            },
            {
              "title": "Model Johari Window",
              "type": "text",
              "content": "Johari Window adalah framework untuk memahami diri:\n\n**1. Open Area** - Hal yang Anda dan orang lain tahu tentang Anda\n**2. Blind Spot** - Hal yang orang lain tahu tapi Anda tidak sadari\n**3. Hidden Area** - Hal yang hanya Anda tahu tentang diri sendiri\n**4. Unknown** - Hal yang tidak diketahui siapa pun\n\nTujuan kita adalah memperluas Open Area dengan:\n• Meminta feedback (mengurangi Blind Spot)\n• Berbagi tentang diri (mengurangi Hidden Area)\n• Eksplorasi diri (mengurangi Unknown)"
            },
            {
              "title": "Teknik Refleksi Diri",
              "type": "text",
              "content": "**Journaling 5 Menit**\nSetiap malam, jawab 3 pertanyaan:\n1. Apa yang berjalan baik hari ini?\n2. Apa yang bisa lebih baik?\n3. Apa yang saya pelajari tentang diri saya?\n\n**Teknik \"Why\" Beruntun**\nSaat merasa emosi kuat, tanyakan \"Mengapa?\" 5 kali untuk sampai ke akar:\n- Saya marah → Mengapa? → Karena deadline mepet → Mengapa itu mengganggu? → Karena saya takut gagal → Mengapa takut gagal? → Karena saya mengaitkan nilai diri dengan hasil kerja."
            },
            {
              "title": "Latihan: SWOT Diri",
              "type": "exercise",
              "content": "Buat analisis SWOT tentang diri Anda:\n\n**S - Strengths (Kekuatan)**\nApa yang Anda lakukan dengan baik? Apa yang orang lain puji?\n\n**W - Weaknesses (Kelemahan)**\nApa yang perlu ditingkatkan? Apa yang Anda hindari?\n\n**O - Opportunities (Peluang)**\nTrend apa yang bisa Anda manfaatkan? Skill apa yang sedang dibutuhkan?\n\n**T - Threats (Ancaman)**\nApa yang menghalangi kemajuan Anda? Kebiasaan buruk apa yang perlu dihilangkan?\n\nLuangkan 10 menit untuk menulis ini!"
            },
            {
              "title": "Ringkasan",
              "type": "summary",
              "content": "Poin penting dari modul ini:\n• Kesadaran diri adalah fondasi pengembangan diri\n• Gunakan Johari Window untuk memahami diri lebih baik\n• Journaling dan refleksi rutin membantu meningkatkan kesadaran diri",
              "key_takeaways": [
                "Hanya 10-15% orang benar-benar memiliki kesadaran diri yang baik",
                "Feedback dari orang lain membantu mengurangi blind spot",
                "Refleksi rutin adalah kunci pengembangan diri berkelanjutan"
              ]
            }
          ],
          "estimated_duration": 20,
          "xp_reward": 25,
          "quiz": {
            "questions": [
              {
                "question": "Bagian Johari Window mana yang berisi hal yang orang lain tahu tapi Anda tidak sadari?",
                "options": ["Open Area", "Blind Spot", "Hidden Area", "Unknown"],
                "correct": 1
              },
              {
                "question": "Berapa persen orang yang benar-benar memiliki kesadaran diri yang baik menurut penelitian?",
                "options": ["50-60%", "30-40%", "10-15%", "95%"],
                "correct": 2
              }
            ]
          }
        }'::jsonb, 1, 20, self_awareness_id, 2, true
    ),
    
    -- Module 3: Manajemen Emosi
    (
        'Mengelola Emosi dengan Sehat',
        'Managing Emotions Healthily',
        'Pelajari teknik untuk mengenali, memahami, dan mengelola emosi secara konstruktif.',
        'Learn techniques to recognize, understand, and manage emotions constructively.',
        '{
          "sections": [
            {
              "title": "Emosi: Kawan atau Lawan?",
              "type": "text",
              "content": "Emosi sering dianggap sesuatu yang harus ditekan. Padahal, emosi adalah sinyal penting yang memberikan informasi tentang diri dan situasi kita.\n\n**Emosi dasar manusia:**\n• Senang (Joy) - Sinyal bahwa kebutuhan terpenuhi\n• Sedih (Sadness) - Sinyal kehilangan atau kekurangan\n• Marah (Anger) - Sinyal batasan dilanggar\n• Takut (Fear) - Sinyal ancaman potensial\n• Jijik (Disgust) - Sinyal sesuatu berbahaya atau tidak sesuai nilai\n• Terkejut (Surprise) - Sinyal sesuatu tidak terduga\n\nTidak ada emosi yang \"buruk\". Yang penting adalah bagaimana kita meresponsnya."
            },
            {
              "title": "Emotional Hijack: Mengapa Kita Bereaksi Berlebihan",
              "type": "text",
              "content": "Pernahkah Anda mengatakan atau melakukan sesuatu saat marah yang kemudian Anda sesali? Itu adalah emotional hijack.\n\n**Proses yang terjadi:**\n1. Stimulus → Amygdala (otak emosi) bereaksi dalam 0.05 detik\n2. Korteks prefrontal (otak rasional) baru aktif setelah 6 detik\n3. Jika kita bereaksi sebelum 6 detik, otak emosi yang \"menang\"\n\n**Solusinya: STOP Technique**\n• **S** - Stop. Berhenti sejenak.\n• **T** - Take a breath. Ambil napas dalam.\n• **O** - Observe. Amati apa yang Anda rasakan.\n• **P** - Proceed. Lanjutkan dengan respons yang dipilih, bukan reaktif."
            },
            {
              "title": "Teknik Regulasi Emosi",
              "type": "text",
              "content": "**1. Grounding 5-4-3-2-1**\nSaat merasa overwhelmed:\n- 5 hal yang Anda LIHAT\n- 4 hal yang Anda DENGAR\n- 3 hal yang Anda SENTUH\n- 2 hal yang Anda CIUM\n- 1 hal yang Anda RASAKAN di mulut\n\n**2. Reframing**\nUbah perspektif tentang situasi:\n\"Ini adalah masalah\" → \"Ini adalah tantangan yang bisa saya pelajari\"\n\n**3. Physical Release**\n- Jalan kaki 10 menit\n- Tarik napas dalam 4-7-8 (hirup 4 detik, tahan 7 detik, hembuskan 8 detik)\n- Progressive muscle relaxation"
            },
            {
              "title": "Latihan: Emotion Journal",
              "type": "exercise",
              "content": "Selama seminggu ke depan, catat emosi Anda:\n\n**Template:**\n• Waktu & Situasi: (Apa yang terjadi?)\n• Emosi: (Apa yang saya rasakan? Intensitas 1-10)\n• Pikiran: (Apa yang saya pikirkan saat itu?)\n• Reaksi: (Apa yang saya lakukan?)\n• Pola: (Apakah ada pola berulang?)\n\nSetelah seminggu, review dan identifikasi:\n1. Trigger tersering Anda\n2. Pola reaksi yang ingin diubah\n3. Teknik yang paling efektif untuk Anda"
            },
            {
              "title": "Ringkasan",
              "type": "summary",
              "content": "Poin penting dari modul ini:\n• Emosi adalah sinyal penting, bukan musuh\n• Emotional hijack terjadi dalam 6 detik pertama\n• Teknik STOP membantu memberi jeda untuk respons yang lebih baik",
              "key_takeaways": [
                "Semua emosi valid, yang penting adalah respons kita",
                "Korteks prefrontal butuh 6 detik untuk aktif - gunakan jeda",
                "Grounding dan reframing adalah teknik regulasi emosi yang efektif"
              ]
            }
          ],
          "estimated_duration": 25,
          "xp_reward": 25,
          "quiz": {
            "questions": [
              {
                "question": "Berapa lama korteks prefrontal (otak rasional) membutuhkan waktu untuk aktif?",
                "options": ["0.05 detik", "2 detik", "6 detik", "30 detik"],
                "correct": 2
              },
              {
                "question": "Apa kepanjangan dari teknik STOP?",
                "options": ["Stay, Think, Observe, Proceed", "Stop, Take a breath, Observe, Proceed", "Start, Think, Overcome, Plan", "Stop, Talk, Organize, Plan"],
                "correct": 1
              }
            ]
          }
        }'::jsonb, 1, 20, emotional_id, 3, true
    );

END $$;
