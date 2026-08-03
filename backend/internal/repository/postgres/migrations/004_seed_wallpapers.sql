-- +migrate Up
-- دسته‌ها
INSERT INTO categories (id, title, sort_order) VALUES
    ('shohada', 'شهدا', 1),
    ('nature',  'طبیعت', 2),
    ('holo',    'هولوگرافیک', 3)
ON CONFLICT (id) DO NOTHING;

-- نمونه والپیپرها: ۱۰ تای اول رایگان، بقیه پولی.
-- تصاویر نمونه از picsum.photos هستند؛ در production با CDN واقعی خودت جایگزین کن.
INSERT INTO wallpapers (id, title, category, premium, thumb, full_url, width, height, bytes) VALUES
    ('w_001', 'مسیر نور',       'shohada', false, 'https://picsum.photos/seed/w_001/240/520', 'https://picsum.photos/seed/w_001/1080/2340', 1080, 2340, 850000),
    ('w_002', 'آسمان شب',       'nature',  false, 'https://picsum.photos/seed/w_002/240/520', 'https://picsum.photos/seed/w_002/1080/2340', 1080, 2340, 820000),
    ('w_003', 'کوهستان',        'nature',  false, 'https://picsum.photos/seed/w_003/240/520', 'https://picsum.photos/seed/w_003/1080/2340', 1080, 2340, 910000),
    ('w_004', 'سحرگاه',         'nature',  false, 'https://picsum.photos/seed/w_004/240/520', 'https://picsum.photos/seed/w_004/1080/2340', 1080, 2340, 780000),
    ('w_005', 'حرم',            'shohada', false, 'https://picsum.photos/seed/w_005/240/520', 'https://picsum.photos/seed/w_005/1080/2340', 1080, 2340, 880000),
    ('w_006', 'دریا',           'nature',  false, 'https://picsum.photos/seed/w_006/240/520', 'https://picsum.photos/seed/w_006/1080/2340', 1080, 2340, 830000),
    ('w_007', 'مه صبحگاهی',     'nature',  false, 'https://picsum.photos/seed/w_007/240/520', 'https://picsum.photos/seed/w_007/1080/2340', 1080, 2340, 800000),
    ('w_008', 'هولوگرام آبی',   'holo',    false, 'https://picsum.photos/seed/w_008/240/520', 'https://picsum.photos/seed/w_008/1080/2340', 1080, 2340, 760000),
    ('w_009', 'هولوگرام طلایی', 'holo',    false, 'https://picsum.photos/seed/w_009/240/520', 'https://picsum.photos/seed/w_009/1080/2340', 1080, 2340, 770000),
    ('w_010', 'ستارگان',        'nature',  false, 'https://picsum.photos/seed/w_010/240/520', 'https://picsum.photos/seed/w_010/1080/2340', 1080, 2340, 840000),
    ('w_011', 'شفق قطبی',       'nature',  true,  'https://picsum.photos/seed/w_011/240/520', 'https://picsum.photos/seed/w_011/1080/2340', 1080, 2340, 950000),
    ('w_012', 'کهکشان',         'holo',    true,  'https://picsum.photos/seed/w_012/240/520', 'https://picsum.photos/seed/w_012/1080/2340', 1080, 2340, 990000)
ON CONFLICT (id) DO NOTHING;

UPDATE catalog_meta SET version = version + 1;

-- +migrate Down
DELETE FROM wallpapers WHERE id IN
    ('w_001','w_002','w_003','w_004','w_005','w_006','w_007','w_008','w_009','w_010','w_011','w_012');
DELETE FROM categories WHERE id IN ('shohada','nature','holo');
