-- JournAllist Seed Data - Run in Supabase SQL Editor
-- Contains articles with comprehension questions for reading analysis

-- Get the "Komunikasi" category ID (reading comprehension relates to communication)
DO $$
DECLARE
    communication_category_id UUID;
BEGIN
    SELECT id INTO communication_category_id FROM public.soft_skill_categories WHERE slug = 'communication';
    
    -- Insert JournAllist challenges (articles)
    INSERT INTO public.challenges (feature, type, title, title_en, description, description_en, content, energy_cost, min_level, is_active) VALUES
    
    ('journallist', 'practice', 
     'Komunikasi Efektif di Era Digital', 
     'Effective Communication in Digital Era',
     'Artikel tentang tantangan dan strategi komunikasi di dunia digital.',
     'Article about communication challenges and strategies in the digital world.',
     '{
       "article": {
         "title": "Komunikasi Efektif di Era Digital",
         "author": "Prof. Rina Komunikasi",
         "read_time": 5,
         "content": "Di era digital, cara kita berkomunikasi telah berubah drastis. Pesan singkat dan media sosial menjadi saluran utama, namun kualitas komunikasi sering terganggu.\n\nMenurut penelitian terbaru, 70% kesalahpahaman di tempat kerja berasal dari komunikasi digital yang ambigu. Emoji yang dimaksudkan bercanda bisa diartikan sarkastik. Email singkat bisa terkesan dingin atau tidak sopan.\n\nDr. Maya, pakar komunikasi dari UI, menyarankan prinsip 3K: Klarifikasi sebelum asumsi, Konteks yang jelas, dan Konfirmasi pemahaman. \"Sebelum marah karena pesan yang terasa menyinggung, tanyakan dulu maksudnya,\" ujarnya.\n\nBeberapa tips praktis:\n1. Gunakan video call untuk diskusi sensitif\n2. Baca ulang pesan sebelum mengirim\n3. Tambahkan konteks jika pesan bisa multitafsir\n4. Jangan balas saat emosi tinggi\n\nKomunikasi digital efektif bukan tentang mengurangi penggunaan teknologi, tapi menggunakannya dengan lebih bijak dan penuh kesadaran.",
         "key_points": [
           "70% kesalahpahaman di tempat kerja berasal dari komunikasi digital ambigu",
           "Prinsip 3K: Klarifikasi, Konteks, Konfirmasi",
           "Video call lebih baik untuk diskusi sensitif"
         ]
       },
       "questions": [
         {
           "id": 1,
           "question": "Menurut artikel, berapa persen kesalahpahaman di tempat kerja berasal dari komunikasi digital yang ambigu?",
           "options": [
             {"id": "A", "text": "50%", "is_correct": false},
             {"id": "B", "text": "60%", "is_correct": false},
             {"id": "C", "text": "70%", "is_correct": true},
             {"id": "D", "text": "80%", "is_correct": false}
           ]
         },
         {
           "id": 2,
           "question": "Apa kepanjangan dari prinsip 3K yang disarankan Dr. Maya?",
           "options": [
             {"id": "A", "text": "Komunikasi, Kolaborasi, Koordinasi", "is_correct": false},
             {"id": "B", "text": "Klarifikasi, Konteks, Konfirmasi", "is_correct": true},
             {"id": "C", "text": "Kreatif, Konsisten, Kompeten", "is_correct": false},
             {"id": "D", "text": "Kritis, Konstruktif, Kooperatif", "is_correct": false}
           ]
         },
         {
           "id": 3,
           "question": "Untuk topik apa sebaiknya menggunakan video call menurut artikel?",
           "options": [
             {"id": "A", "text": "Semua diskusi kerja", "is_correct": false},
             {"id": "B", "text": "Diskusi sensitif", "is_correct": true},
             {"id": "C", "text": "Sharing dokumen", "is_correct": false},
             {"id": "D", "text": "Update status proyek", "is_correct": false}
           ]
         }
       ],
       "discussion_points": [
         "Bagaimana pengalaman Anda dengan miskomunikasi digital?",
         "Tips apa yang sudah Anda terapkan?"
       ],
       "skill_focus": ["Reading Comprehension", "Information Retention", "Critical Analysis"]
     }'::jsonb, 2, 1, true),
    
    ('journallist', 'practice',
     'Seni Mendengarkan Aktif',
     'The Art of Active Listening',
     'Mengapa mendengarkan lebih penting dari berbicara dalam komunikasi.',
     'Why listening is more important than speaking in communication.',
     '{
       "article": {
         "title": "Seni Mendengarkan Aktif",
         "author": "Dr. Budi Empati",
         "read_time": 4,
         "content": "Kebanyakan orang hanya menunggu giliran berbicara, bukan benar-benar mendengarkan. Padahal, mendengarkan aktif adalah fondasi dari setiap hubungan yang sehat.\n\nMenurut Stephen Covey, \"Kebanyakan orang tidak mendengarkan dengan niat memahami; mereka mendengarkan dengan niat membalas.\" Fenomena ini disebut pseudo-listening.\n\nTanda-tanda pendengar aktif:\n• Kontak mata yang nyaman (bukan melotot)\n• Bahasa tubuh terbuka\n• Memberikan respons verbal pendek (\"hmm\", \"lalu?\")\n• Tidak menyela\n• Mengajukan pertanyaan klarifikasi\n• Merangkum apa yang didengar\n\nPenelitian menunjukkan bahwa manajer yang baik menghabiskan 80% waktunya untuk mendengarkan dan hanya 20% untuk berbicara. Ironisnya, semakin tinggi jabatan seseorang, semakin sedikit mereka mendengarkan.\n\nLatihan yang bisa dicoba: Dalam percakapan berikutnya, tantang diri untuk tidak menyela sama sekali dan rangkum pembicaraan lawan bicara sebelum merespons.",
         "key_points": [
           "Pseudo-listening: mendengarkan dengan niat membalas, bukan memahami",
           "Manajer baik: 80% mendengarkan, 20% berbicara",
           "Tanda pendengar aktif: kontak mata, tidak menyela, merangkum"
         ]
       },
       "questions": [
         {
           "id": 1,
           "question": "Apa yang dimaksud dengan pseudo-listening menurut artikel?",
           "options": [
             {"id": "A", "text": "Mendengarkan sambil multitasking", "is_correct": false},
             {"id": "B", "text": "Mendengarkan dengan niat membalas, bukan memahami", "is_correct": true},
             {"id": "C", "text": "Berpura-pura tidak mendengar", "is_correct": false},
             {"id": "D", "text": "Mendengarkan dengan headphone", "is_correct": false}
           ]
         },
         {
           "id": 2,
           "question": "Berapa persentase waktu yang dihabiskan manajer baik untuk mendengarkan?",
           "options": [
             {"id": "A", "text": "50%", "is_correct": false},
             {"id": "B", "text": "60%", "is_correct": false},
             {"id": "C", "text": "70%", "is_correct": false},
             {"id": "D", "text": "80%", "is_correct": true}
           ]
         },
         {
           "id": 3,
           "question": "Manakah yang BUKAN tanda pendengar aktif menurut artikel?",
           "options": [
             {"id": "A", "text": "Menyela untuk memberikan saran cepat", "is_correct": true},
             {"id": "B", "text": "Kontak mata yang nyaman", "is_correct": false},
             {"id": "C", "text": "Mengajukan pertanyaan klarifikasi", "is_correct": false},
             {"id": "D", "text": "Merangkum apa yang didengar", "is_correct": false}
           ]
         }
       ],
       "discussion_points": [
         "Seberapa sering Anda melakukan pseudo-listening?",
         "Bagaimana rasanya ketika orang benar-benar mendengarkan Anda?"
       ],
       "skill_focus": ["Active Listening", "Self-awareness", "Reading Comprehension"]
     }'::jsonb, 2, 1, true),

    ('journallist', 'challenge',
     'Mengelola Konflik dengan Cerdas',
     'Managing Conflicts Intelligently',
     'Strategi menghadapi konflik secara konstruktif tanpa merusak hubungan.',
     'Strategies for handling conflicts constructively without damaging relationships.',
     '{
       "article": {
         "title": "Mengelola Konflik dengan Cerdas",
         "author": "Dr. Andi Resolusi",
         "read_time": 6,
         "content": "Konflik adalah bagian alami dari interaksi manusia. Yang membedakan adalah cara kita menanganinya. Thomas-Kilmann mengidentifikasi 5 gaya mengelola konflik:\n\n1. Menghindar (Avoiding): Menarik diri dari konflik. Berguna saat masalah sepele atau butuh waktu untuk tenang.\n\n2. Mengakomodasi (Accommodating): Mengalah demi hubungan. Baik saat hubungan lebih penting dari isu.\n\n3. Bersaing (Competing): Win-lose, fokus pada kemenangan sendiri. Hanya cocok untuk keputusan mendesak.\n\n4. Berkompromi (Compromising): Kedua pihak mengorbankan sesuatu. Solusi cepat tapi tidak optimal.\n\n5. Berkolaborasi (Collaborating): Win-win, mencari solusi yang memuaskan semua pihak. Membutuhkan waktu tapi hasil terbaik.\n\nPenelitian Harvard menunjukkan konflik yang dikelola dengan baik justru meningkatkan inovasi tim sebesar 25%. Kuncinya adalah memisahkan orang dari masalah, fokus pada kepentingan bukan posisi, dan menciptakan opsi yang saling menguntungkan.\n\nPeringatan: hindari konflik di momen emosi tinggi. Penelitian menunjukkan kortisol (hormon stres) membutuhkan 20-30 menit untuk turun. Beri jeda sebelum diskusi berat.",
         "key_points": [
           "5 gaya Thomas-Kilmann: Avoiding, Accommodating, Competing, Compromising, Collaborating",
           "Konflik yang dikelola baik meningkatkan inovasi 25%",
           "Kortisol butuh 20-30 menit untuk turun setelah emosi tinggi"
         ]
       },
       "questions": [
         {
           "id": 1,
           "question": "Gaya konflik mana yang digambarkan sebagai win-win menurut Thomas-Kilmann?",
           "options": [
             {"id": "A", "text": "Compromising", "is_correct": false},
             {"id": "B", "text": "Collaborating", "is_correct": true},
             {"id": "C", "text": "Accommodating", "is_correct": false},
             {"id": "D", "text": "Competing", "is_correct": false}
           ]
         },
         {
           "id": 2,
           "question": "Berapa persen peningkatan inovasi tim dari konflik yang dikelola baik menurut penelitian Harvard?",
           "options": [
             {"id": "A", "text": "15%", "is_correct": false},
             {"id": "B", "text": "20%", "is_correct": false},
             {"id": "C", "text": "25%", "is_correct": true},
             {"id": "D", "text": "30%", "is_correct": false}
           ]
         },
         {
           "id": 3,
           "question": "Berapa lama kortisol membutuhkan waktu untuk turun setelah emosi tinggi?",
           "options": [
             {"id": "A", "text": "5-10 menit", "is_correct": false},
             {"id": "B", "text": "10-15 menit", "is_correct": false},
             {"id": "C", "text": "20-30 menit", "is_correct": true},
             {"id": "D", "text": "45-60 menit", "is_correct": false}
           ]
         }
       ],
       "discussion_points": [
         "Gaya konflik mana yang paling sering Anda gunakan?",
         "Kapan sebaiknya menggunakan gaya Avoiding?"
       ],
       "skill_focus": ["Conflict Resolution", "Emotional Intelligence", "Reading Comprehension"]
     }'::jsonb, 2, 2, true);

    -- Link challenges to communication category
    INSERT INTO public.challenge_skill_weights (challenge_id, category_id, weight)
    SELECT c.id, communication_category_id, 1.0
    FROM public.challenges c
    WHERE c.feature = 'journallist' AND NOT EXISTS (
        SELECT 1 FROM public.challenge_skill_weights csw 
        WHERE csw.challenge_id = c.id AND csw.category_id = communication_category_id
    );

END $$;
