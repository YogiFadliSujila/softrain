-- Ethicquiz Seed Data - Run in Supabase SQL Editor
-- Contains 10 ethical dilemma scenarios with multiple choices

-- First, get the "Nilai Etika" category ID
DO $$
DECLARE
    ethical_category_id UUID;
BEGIN
    SELECT id INTO ethical_category_id FROM public.soft_skill_categories WHERE slug = 'ethical-values';
    
    -- Insert Ethicquiz challenges
    INSERT INTO public.challenges (feature, type, title, title_en, description, description_en, content, energy_cost, min_level, is_active) VALUES
    
    ('ethicquiz', 'practice', 
     'Uang Kembalian Lebih', 
     'Extra Change',
     'Saat berbelanja, kasir memberikan kembalian lebih dari yang seharusnya.',
     'When shopping, the cashier gives you more change than they should.',
     '{
       "scenario": "Anda baru saja berbelanja di minimarket dan kasir memberikan kembalian Rp 50.000 lebih dari yang seharusnya. Kasir tersebut adalah pegawai baru yang terlihat gugup. Tidak ada orang lain yang menyadari kesalahan ini.",
       "scenario_en": "You just shopped at a minimarket and the cashier gave you Rp 50,000 more change than they should. The cashier is a new employee who looks nervous. No one else noticed this mistake.",
       "options": [
         {"id": "A", "text": "Mengembalikan uang tersebut dan memberitahu kasir dengan ramah tentang kesalahannya", "ethics_score": 100, "feedback": "Pilihan yang sangat etis! Kejujuran dan empati Anda membantu kasir belajar tanpa merasa malu."},
         {"id": "B", "text": "Menyimpan uang tersebut karena itu kesalahan kasir, bukan kesalahan Anda", "ethics_score": 20, "feedback": "Meskipun secara teknis bukan kesalahan Anda, mengambil keuntungan dari kesalahan orang lain tidak etis."},
         {"id": "C", "text": "Diam saja dan pergi, tapi merasa tidak enak sepanjang hari", "ethics_score": 30, "feedback": "Perasaan tidak enak menunjukkan moral compass Anda bekerja, tapi tidak bertindak tetap merugikan orang lain."},
         {"id": "D", "text": "Memberitahu supervisor kasir agar kasir ditegur", "ethics_score": 50, "feedback": "Niat baik, tapi bisa membuat kasir dalam masalah. Ada cara yang lebih bijak untuk menangani situasi ini."}
       ],
       "explanation": "Dilema ini menguji kejujuran dan empati. Pilihan terbaik adalah mengembalikan dengan cara yang tidak mempermalukan kasir.",
       "related_values": ["Kejujuran", "Empati", "Integritas"]
     }'::jsonb, 2, 1, true),
    
    ('ethicquiz', 'practice',
     'Teman yang Menyontek',
     'Cheating Friend',
     'Sahabat Anda meminta bantuan menyontek saat ujian penting.',
     'Your best friend asks for help cheating on an important exam.',
     '{
       "scenario": "Sahabat Anda yang sedang mengalami masalah keluarga meminta Anda untuk memberikan contekan saat ujian akhir semester. Ia bilang jika tidak lulus, ia akan di-DO dari kampus. Anda tahu ia sebenarnya pintar tapi tidak sempat belajar karena harus merawat orang tuanya yang sakit.",
       "scenario_en": "Your best friend who is going through family problems asks you to help them cheat on the final exam. They say if they do not pass, they will be expelled. You know they are actually smart but could not study because they had to care for their sick parents.",
       "options": [
         {"id": "A", "text": "Membantu menyontek karena situasinya memang sulit", "ethics_score": 25, "feedback": "Niat membantu teman baik, tapi menyontek tetap tidak jujur dan bisa merugikan kalian berdua jika ketahuan."},
         {"id": "B", "text": "Menolak tegas dan mengancam akan melaporkannya", "ethics_score": 40, "feedback": "Menolak menyontek benar, tapi mengancam teman yang sedang dalam kesulitan kurang empatik."},
         {"id": "C", "text": "Menolak membantu menyontek, tapi menawarkan bantuan belajar intensif malam sebelumnya", "ethics_score": 95, "feedback": "Pilihan bijak! Anda menjaga integritas sekaligus menunjukkan dukungan nyata untuk teman."},
         {"id": "D", "text": "Menyarankan teman untuk bicara dengan dosen tentang situasinya dan meminta ujian susulan", "ethics_score": 100, "feedback": "Pilihan terbaik! Ini solusi yang jujur, proaktif, dan bisa memberikan hasil terbaik untuk semua pihak."}
       ],
       "explanation": "Dilema ini menguji keseimbangan antara loyalitas pada teman dan integritas akademik.",
       "related_values": ["Integritas", "Loyalitas", "Problem-solving"]
     }'::jsonb, 2, 1, true),
    
    ('ethicquiz', 'practice',
     'Gosip di Kantor',
     'Office Gossip',
     'Anda mendengar gosip negatif tentang rekan kerja yang tidak benar.',
     'You hear negative gossip about a coworker that is not true.',
     '{
       "scenario": "Di ruang istirahat, Anda mendengar beberapa rekan menyebarkan gosip bahwa salah satu kolega Anda, Andi, mendapat promosi karena ada hubungan spesial dengan manajer. Anda tahu ini tidak benar karena Anda yang membantu Andi mempersiapkan presentasinya yang sangat memukau.",
       "scenario_en": "In the break room, you hear colleagues spreading gossip that your colleague Andi got promoted because of a special relationship with the manager. You know this is not true because you helped Andi prepare their impressive presentation.",
       "options": [
         {"id": "A", "text": "Diam saja karena tidak ingin ikut campur", "ethics_score": 30, "feedback": "Diam berarti membiarkan ketidakadilan terjadi. Terkadang tidak bertindak juga bentuk partisipasi."},
         {"id": "B", "text": "Ikut bergabung dalam gosip agar diterima kelompok", "ethics_score": 10, "feedback": "Mengikuti gosip yang Anda tahu tidak benar sangat tidak etis dan merusak reputasi orang lain."},
         {"id": "C", "text": "Menyela dengan memberi fakta bahwa Anda melihat sendiri kerja keras Andi", "ethics_score": 100, "feedback": "Berani! Anda membela kebenaran dan melindungi reputasi rekan kerja dengan fakta."},
         {"id": "D", "text": "Memberitahu Andi secara privat tentang gosip tersebut", "ethics_score": 60, "feedback": "Memberi tahu Andi baik, tapi gosip tetap beredar. Lebih baik menghentikan gosip di sumbernya."}
       ],
       "explanation": "Dilema ini menguji keberanian moral untuk membela kebenaran meski tidak populer.",
       "related_values": ["Keberanian Moral", "Keadilan", "Kejujuran"]
     }'::jsonb, 2, 1, true),

    ('ethicquiz', 'challenge',
     'Konflik Kepentingan',
     'Conflict of Interest',
     'Anda diminta menilai proposal dari perusahaan kerabat Anda.',
     'You are asked to evaluate a proposal from your relatives company.',
     '{
       "scenario": "Sebagai anggota tim evaluasi tender, Anda baru menyadari bahwa salah satu proposal terbaik berasal dari perusahaan milik paman Anda. Proposal tersebut memang berkualitas tinggi dan harganya kompetitif. Tidak ada yang tahu hubungan keluarga Anda dengan perusahaan tersebut.",
       "scenario_en": "As a member of the tender evaluation team, you just realized that one of the best proposals comes from your uncles company. The proposal is indeed high quality and competitively priced. No one knows about your family relationship with the company.",
       "options": [
         {"id": "A", "text": "Meloloskan proposal karena memang kualitasnya bagus", "ethics_score": 20, "feedback": "Meski proposalnya bagus, tidak mengungkapkan konflik kepentingan adalah pelanggaran etika profesional."},
         {"id": "B", "text": "Mengundurkan diri dari tim evaluasi dan mengungkapkan alasannya", "ethics_score": 100, "feedback": "Pilihan paling etis! Anda menjaga integritas proses dan transparansi profesional."},
         {"id": "C", "text": "Memberikan penilaian rendah agar tidak dicurigai", "ethics_score": 30, "feedback": "Ini juga tidak adil - memberikan penilaian yang tidak objektif ke arah manapun tetap tidak etis."},
         {"id": "D", "text": "Diam saja dan memberikan penilaian seobjektif mungkin", "ethics_score": 50, "feedback": "Niat baik, tapi tidak mengungkapkan konflik kepentingan tetap berisiko dan tidak transparan."}
       ],
       "explanation": "Konflik kepentingan harus selalu diungkapkan, apapun hasilnya. Transparansi adalah kunci.",
       "related_values": ["Transparansi", "Integritas Profesional", "Objektivitas"]
     }'::jsonb, 2, 2, true),

    ('ethicquiz', 'challenge',
     'Kesalahan Atasan',
     'Bosss Mistake',
     'Atasan Anda membuat keputusan berbahaya berdasarkan data yang salah.',
     'Your boss makes a dangerous decision based on incorrect data.',
     '{
       "scenario": "Manajer Anda akan mempresentasikan laporan ke direksi untuk keputusan investasi besar. Anda menyadari ada kesalahan data yang signifikan dalam laporan, tapi manajer Anda orangnya temperamental dan tidak suka dikritik. Presentasi dilakukan besok pagi.",
       "scenario_en": "Your manager is going to present a report to directors for a major investment decision. You notice there is a significant data error in the report, but your manager is temperamental and does not like criticism. The presentation is tomorrow morning.",
       "options": [
         {"id": "A", "text": "Diam saja karena takut dengan reaksi manajer", "ethics_score": 15, "feedback": "Ketakutan Anda bisa dipahami, tapi membiarkan kesalahan bisa merugikan perusahaan secara besar."},
         {"id": "B", "text": "Langsung menegur manajer di depan rekan-rekan", "ethics_score": 35, "feedback": "Niat baik, tapi cara yang tidak bijak. Ini bisa mempermalukan manajer dan memperburuk situasi."},
         {"id": "C", "text": "Mengirim email ke manajer dengan data yang benar, disertai solusi perbaikan", "ethics_score": 95, "feedback": "Cara yang profesional dan konstruktif. Anda membantu tanpa mempermalukan."},
         {"id": "D", "text": "Langsung melapor ke direksi tanpa memberitahu manajer", "ethics_score": 40, "feedback": "Ini bisa dianggap melompati rantai komando dan merusak hubungan kerja."}
       ],
       "explanation": "Menyampaikan kebenaran dengan cara yang tepat menunjukkan kedewasaan profesional.",
       "related_values": ["Keberanian", "Profesionalisme", "Komunikasi Efektif"]
     }'::jsonb, 2, 3, true);

    -- Link challenges to ethical-values category
    INSERT INTO public.challenge_skill_weights (challenge_id, category_id, weight)
    SELECT c.id, ethical_category_id, 1.0
    FROM public.challenges c
    WHERE c.feature = 'ethicquiz' AND NOT EXISTS (
        SELECT 1 FROM public.challenge_skill_weights csw 
        WHERE csw.challenge_id = c.id AND csw.category_id = ethical_category_id
    );

END $$;
