import type { Locale } from './index'

/**
 * Every user-visible string in the product, in one place.
 *
 * It lives here rather than in components so the copy scan in
 * `tests/integrity/copy.test.ts` has something exhaustive to read. Radiance
 * is not development, prosperity or GDP; the wording throughout names the
 * measurement — light — and nothing else. PRD.md §5, CLAUDE.md invariant 6.
 */

interface Copy {
  readonly siteName: string
  readonly tagline: string
  readonly nav: {
    readonly browse: string
    readonly compare: string
    readonly change: string
    readonly method: string
    readonly switchLanguage: string
  }
  readonly overview: {
    readonly title: string
    readonly lede: string
    readonly searchLabel: string
    readonly searchPlaceholder: string
    readonly noMatches: string
    readonly cityCount: (count: number) => string
    readonly yearLabel: string
    readonly mapCaption: string
    readonly openCity: string
  }
  readonly city: {
    readonly backToBrowse: string
    readonly province: string
    readonly window: string
    readonly windowValue: (spanKm: number) => string
    readonly play: string
    readonly pause: string
    readonly scrubberLabel: string
    readonly currentMonth: string
    readonly meanRadiance: string
    readonly meanRadianceUnit: string
    readonly litRatio: string
    readonly observations: string
    readonly observationsUnit: string
    readonly adequacyAdequate: string
    readonly adequacySparse: string
    readonly noDataMonth: string
    readonly noDataReadout: string
    readonly layerMonthly: string
    readonly layerAnnual: string
    readonly smallMultiples: string
    readonly smallMultiplesHint: string
    readonly tableTitle: string
    readonly tableHint: string
    readonly flagsTitle: string
    readonly flagsNone: string
    readonly coverage: (adequate: number, sparse: number, noData: number) => string
  }
  readonly chart: {
    readonly radianceAxis: string
    readonly observationAxis: string
    readonly bandExplainer: string
    readonly sparseExplainer: string
    readonly noDataExplainer: string
  }
  readonly legend: {
    readonly title: string
    readonly layerLine: (product: string) => string
    readonly monthlyUnfiltered: string
    readonly annualFiltered: string
    readonly bandMeaning: string
    readonly darkSwatch: string
    readonly noDataSwatch: string
    readonly flagSwatch: string
    readonly period: (from: string, to: string) => string
  }
  readonly compare: {
    readonly title: string
    readonly lede: string
    readonly presetLabel: string
    readonly addCity: string
    readonly remove: string
    readonly limitReached: string
    readonly mobileLimit: string
    readonly bandNote: string
  }
  readonly change: {
    readonly title: string
    readonly lede: string
    readonly metricLitRatio: string
    readonly metricRadiance: string
    readonly fromYear: string
    readonly toYear: string
    readonly columnCity: string
    readonly columnLitChange: string
    readonly columnRadianceChange: string
    readonly columnCoverage: string
    readonly coverageAdequate: string
    readonly coverageThin: string
    readonly coverageMissing: string
    readonly underpoweredNote: string
    readonly interpretation: string
  }
  readonly method: {
    readonly title: string
    readonly sections: readonly { readonly heading: string; readonly body: readonly string[] }[]
  }
  readonly provenance: {
    readonly syntheticTitle: string
    readonly eogTitle: string
  }
  readonly footerNote: string
}

const ID: Copy = {
  siteName: 'Cahaya Malam',
  tagline:
    'Empat belas tahun citra cahaya malam dari satelit, kota demi kota — dan mengapa piksel gelap biasanya berarti satelit tidak bisa melihat, bukan bahwa tidak ada cahaya di sana.',
  nav: {
    browse: 'Jelajah',
    compare: 'Banding',
    change: 'Perubahan',
    method: 'Metode',
    switchLanguage: 'English',
  },
  overview: {
    title: 'Jelajah',
    lede: 'Komposit tahunan seluruh Indonesia, sangat diperkecil. Ini pintu masuk, bukan tujuannya. Pilih satu kota untuk melihat rangkaian bulanannya.',
    searchLabel: 'Cari kota',
    searchPlaceholder: 'Ketik nama kota atau provinsi',
    noMatches: 'Tidak ada kota yang cocok.',
    cityCount: (count) => `${count} kota`,
    yearLabel: 'Tahun komposit',
    mapCaption:
      'Komposit tahunan VIIRS DNB. Lapisan tahunan sudah dibersihkan dari cahaya sementara seperti kebakaran dan kapal.',
    openCity: 'Buka',
  },
  city: {
    backToBrowse: 'Kembali ke jelajah',
    province: 'Provinsi',
    window: 'Jendela',
    windowValue: (spanKm) => `${spanKm} km persegi, resolusi asli`,
    play: 'Putar',
    pause: 'Jeda',
    scrubberLabel: 'Geser bulan',
    currentMonth: 'Bulan',
    meanRadiance: 'Radians rata-rata',
    meanRadianceUnit: 'nW/cm²/sr',
    litRatio: 'Bagian piksel bercahaya',
    observations: 'Pengamatan bebas awan',
    observationsUnit: 'malam',
    adequacyAdequate: 'memadai',
    adequacySparse: 'jarang',
    noDataMonth: 'Tanpa data',
    noDataReadout:
      'Tidak ada satu pun pengamatan bebas awan pada bulan ini. Tidak ada nilai radians untuk ditampilkan — dan ini bukan kegelapan.',
    layerMonthly: 'Bulanan',
    layerAnnual: 'Tahunan',
    smallMultiples: 'Semua bulan sekaligus',
    smallMultiplesHint:
      'Setiap bulan dalam satu kisi. Bulan tanpa pengamatan diarsir, bukan dihitamkan.',
    tableTitle: 'Tabel',
    tableHint:
      'Padanan teks dari grafik di atas. Selalu ada, dan inilah yang bisa disalin ke pesan.',
    flagsTitle: 'Penanda kontaminasi',
    flagsNone: 'Tidak ada bulan yang menyimpang jauh dari komposit tahunannya di kota ini.',
    coverage: (adequate, sparse, noData) =>
      `${adequate} bulan memadai · ${sparse} bulan jarang · ${noData} bulan tanpa data`,
  },
  chart: {
    radianceAxis: 'Radians rata-rata (nW/cm²/sr)',
    observationAxis: 'Pengamatan bebas awan per bulan',
    bandExplainer:
      'Pita di bawah garis menghitung berapa malam bebas awan yang menyusun komposit bulan itu.',
    sparseExplainer:
      'Bulan dengan sedikit pengamatan digambar lebih tipis, supaya lonjakan berketerandalan rendah tidak terlihat seperti temuan.',
    noDataExplainer:
      'Bulan tanpa satu pun pengamatan bebas awan tidak memiliki garis sama sekali, dan diarsir abu-abu.',
  },
  legend: {
    title: 'Keterangan',
    layerLine: (product) => `Lapisan aktif: ${product}`,
    monthlyUnfiltered:
      'Komposit bulanan VNL v1 belum disaring: di dalamnya masih ada cahaya kebakaran, kapal ikan berlampu, aurora, dan cahaya sementara lain.',
    annualFiltered:
      'Komposit tahunan sudah disaring: cahaya sementara dan latar belakang dihilangkan.',
    bandMeaning:
      'Pita pengamatan menghitung malam bebas awan yang menyusun setiap komposit bulanan. Semakin rendah pitanya, semakin sedikit yang dilihat satelit.',
    darkSwatch: 'Diamati, dan gelap',
    noDataSwatch: 'Tidak ada pengamatan bebas awan — bukan gelap',
    flagSwatch: 'Menyimpang jauh dari komposit tahunan',
    period: (from, to) => `Periode komposit: ${from} sampai ${to}`,
  },
  compare: {
    title: 'Banding',
    lede: 'Dua sampai empat kota pada satu sumbu radians. Pita pengamatan setiap kota berada tepat di bawah garisnya sendiri.',
    presetLabel: 'Prasetel',
    addCity: 'Tambah kota',
    remove: 'Hapus',
    limitReached: 'Maksimum empat kota.',
    mobileLimit: 'Pada layar kecil perbandingan dibatasi dua kota.',
    bandNote:
      'Pita tidak pernah digabung antar kota: keterandalan berbeda per kota per bulan, dan menggabungkannya justru menyembunyikan kasus yang penting.',
  },
  change: {
    title: 'Perubahan cahaya',
    lede: 'Perubahan bagian piksel bercahaya dan radians rata-rata antara dua tahun, dihitung dari komposit tahunan yang sudah disaring.',
    metricLitRatio: 'Perubahan bagian piksel bercahaya',
    metricRadiance: 'Perubahan radians rata-rata',
    fromYear: 'Dari tahun',
    toYear: 'Ke tahun',
    columnCity: 'Kota',
    columnLitChange: 'Δ bagian bercahaya',
    columnRadianceChange: 'Δ radians rata-rata',
    columnCoverage: 'Kecukupan pengamatan',
    coverageAdequate: 'memadai',
    coverageThin: 'tipis',
    coverageMissing: 'tidak ada',
    underpoweredNote:
      'Baris bertanda tipis memiliki liputan bebas awan yang buruk di salah satu tahun ujung. Angkanya tetap ditampilkan, tetapi tidak menopang perbandingan.',
    interpretation:
      'Tabel ini mengukur cahaya yang teramati satelit. Cahaya bukan ukuran ekonomi, bukan penilaian atas satu daerah, dan hubungannya dengan apa pun di darat bersifat tidak linier dan mudah terkontaminasi.',
  },
  method: {
    title: 'Metode',
    sections: [
      {
        heading: 'Data',
        body: [
          'Komposit bebas awan VIIRS Day/Night Band dari Earth Observation Group, Payne Institute for Public Policy, Colorado School of Mines. Domain publik.',
          'Rangkaian bulanan memakai VNL v1. Rangkaian tahunan memakai VNL v2.1.',
        ],
      },
      {
        heading: 'Nol bukan kegelapan',
        body: [
          'Penyedia data menyatakannya sendiri: pada komposit bulanan banyak wilayah tidak memperoleh liputan yang baik, terutama di daerah tropis, sehingga pengguna wajib memakai berkas pengamatan bebas awan dan tidak menganggap nilai nol pada citra radians rata-rata berarti tidak ada cahaya yang teramati.',
          'Indonesia mendekati kasus terburuk di dunia untuk tutupan awan. Karena itu jumlah pengamatan bebas awan menyertai setiap nilai radians di situs ini, di dalam satu catatan yang sama, dan sebuah bulan tanpa pengamatan tidak pernah digambar seperti bulan yang gelap.',
        ],
      },
      {
        heading: 'Bulanan belum disaring',
        body: [
          'Komposit bulanan v1 belum dibersihkan dari aurora, kebakaran, kapal, dan cahaya sementara lain. Hanya komposit tahunan yang memiliki lapisan penghilang cahaya sementara dan latar belakang.',
          'Untuk Indonesia ada dua kontaminan besar di dalam data bulanan: armada kapal ikan berlampu, salah satu yang terbesar di dunia, dan kebakaran gambut — peristiwa asap 2015 dan 2019 muncul sebagai anomali terang yang luas di Sumatra dan Kalimantan.',
          'Karena itu pemisahan sumber adalah isi analisisnya, bukan tahap pembersihan. Penanda kontaminasi di situs ini dihitung dari selisih antara komposit bulanan dan tahunan, tidak pernah ditulis tangan.',
        ],
      },
      {
        heading: 'Apa yang tidak diukur cahaya',
        body: [
          'Radians bukan pembangunan, bukan kemakmuran, dan bukan PDB. Hubungannya tidak linier dan dikacaukan oleh teknologi penerangan, sudut pandang sensor, tata guna lahan, dan kontaminasi.',
          'Situs ini mengukur perubahan bagian piksel bercahaya dan radians rata-rata, dan menyebutnya dengan kata-kata itu. Tidak ada peringkat yang dibingkai sebagai keberhasilan atau kegagalan sebuah daerah.',
        ],
      },
      {
        heading: 'Batas ukuran',
        body: [
          'Kotak batas Indonesia pada resolusi 15 detik busur berisi sekitar 45 juta sel per lapisan, dengan lebih dari 160 lapisan bulanan sejak 2012. Citra bulanan skala nasional tidak mungkin dikirim ke peramban.',
          'Karena itu situs ini mengirim komposit tahunan yang diperkecil untuk peta jelajah, dan jendela sekitar 44 km pada resolusi asli untuk setiap kota, dimuat hanya ketika kotanya dibuka.',
        ],
      },
      {
        heading: 'Yang tidak ada di sini',
        body: [
          'Tidak ada pemantauan waktu nyata atau bulan terkini: komposit selalu tertinggal, dan ini catatan sejarah.',
          'Tidak ada deteksi bencana atau pemadaman listrik. Itu produk operasional dan jawaban yang keliru berakibat nyata.',
          'Tidak ada data DMSP era 1992–2013, karena menyambungnya dengan VIIRS tanpa interkalibrasi adalah kesalahan yang sudah dikenal luas.',
        ],
      },
    ],
  },
  provenance: {
    syntheticTitle: 'Bundel ini dibangun dari data pengganti',
    eogTitle: 'Sumber data',
  },
  footerNote:
    'Situs ini menampilkan cahaya yang teramati satelit pada malam hari. Catatan bersifat historis, bukan terkini.',
}

const EN: Copy = {
  siteName: 'Cahaya Malam',
  tagline:
    'Fourteen years of satellite night imagery, city by city — and why a dark pixel usually means the satellite could not see, not that there was no light there.',
  nav: {
    browse: 'Browse',
    compare: 'Compare',
    change: 'Change',
    method: 'Method',
    switchLanguage: 'Bahasa Indonesia',
  },
  overview: {
    title: 'Browse',
    lede: 'The annual composite for the whole country, downsampled hard. This is the way in, not the destination. Pick a city to see its monthly series.',
    searchLabel: 'Search cities',
    searchPlaceholder: 'Type a city or province',
    noMatches: 'No city matches that.',
    cityCount: (count) => `${count} cities`,
    yearLabel: 'Composite year',
    mapCaption:
      'VIIRS DNB annual composite. The annual layer has temporal lights such as fires and boats removed.',
    openCity: 'Open',
  },
  city: {
    backToBrowse: 'Back to browse',
    province: 'Province',
    window: 'Window',
    windowValue: (spanKm) => `${spanKm} km square, native resolution`,
    play: 'Play',
    pause: 'Pause',
    scrubberLabel: 'Scrub through months',
    currentMonth: 'Month',
    meanRadiance: 'Mean radiance',
    meanRadianceUnit: 'nW/cm²/sr',
    litRatio: 'Lit pixel share',
    observations: 'Cloud-free observations',
    observationsUnit: 'nights',
    adequacyAdequate: 'adequate',
    adequacySparse: 'sparse',
    noDataMonth: 'No data',
    noDataReadout:
      'Not one cloud-free observation this month. There is no radiance value to show — and this is not darkness.',
    layerMonthly: 'Monthly',
    layerAnnual: 'Annual',
    smallMultiples: 'Every month at once',
    smallMultiplesHint:
      'Each month in one grid. Months with no observation are hatched, not blacked out.',
    tableTitle: 'Table',
    tableHint: 'The text equivalent of the chart above. Always present, and what you would paste into a message.',
    flagsTitle: 'Contamination markers',
    flagsNone: 'No month in this city sits far above its own annual composite.',
    coverage: (adequate, sparse, noData) =>
      `${adequate} adequate · ${sparse} sparse · ${noData} with no data`,
  },
  chart: {
    radianceAxis: 'Mean radiance (nW/cm²/sr)',
    observationAxis: 'Cloud-free observations per month',
    bandExplainer:
      'The band under the line counts the cloud-free nights that went into that month’s composite.',
    sparseExplainer:
      'Months with few observations are drawn thinner, so a low-confidence spike does not look like a finding.',
    noDataExplainer:
      'A month with no cloud-free observation at all has no line, and is hatched grey instead.',
  },
  legend: {
    title: 'Legend',
    layerLine: (product) => `Active layer: ${product}`,
    monthlyUnfiltered:
      'The monthly VNL v1 composites are unfiltered: fire light, lit fishing boats, aurora and other temporal lights are still in them.',
    annualFiltered: 'The annual composites are filtered: temporal lights and background are removed.',
    bandMeaning:
      'The observation band counts the cloud-free nights behind each monthly composite. The lower the band, the less the satellite saw.',
    darkSwatch: 'Observed, and dark',
    noDataSwatch: 'No cloud-free observation — not darkness',
    flagSwatch: 'Diverges far from the annual composite',
    period: (from, to) => `Composite period: ${from} to ${to}`,
  },
  compare: {
    title: 'Compare',
    lede: 'Two to four cities on one radiance axis. Each city’s observation band sits directly beneath its own line.',
    presetLabel: 'Preset',
    addCity: 'Add city',
    remove: 'Remove',
    limitReached: 'Four cities maximum.',
    mobileLimit: 'On a small screen the comparison is limited to two cities.',
    bandNote:
      'Bands are never merged across cities: confidence is per city per month, and merging would hide exactly the case that matters.',
  },
  change: {
    title: 'Change in light',
    lede: 'Change in lit pixel share and mean radiance between two years, computed from the filtered annual composites.',
    metricLitRatio: 'Change in lit pixel share',
    metricRadiance: 'Change in mean radiance',
    fromYear: 'From year',
    toYear: 'To year',
    columnCity: 'City',
    columnLitChange: 'Δ lit share',
    columnRadianceChange: 'Δ mean radiance',
    columnCoverage: 'Observation adequacy',
    coverageAdequate: 'adequate',
    coverageThin: 'thin',
    coverageMissing: 'missing',
    underpoweredNote:
      'Rows marked thin had poor cloud-free coverage in one of the endpoint years. The numbers are still shown, but they do not carry the comparison.',
    interpretation:
      'This table measures light the satellite observed. Light is not a measure of an economy, is not a judgement of a region, and its relationship to anything on the ground is nonlinear and easily contaminated.',
  },
  method: {
    title: 'Method',
    sections: [
      {
        heading: 'The data',
        body: [
          'VIIRS Day/Night Band cloud-free composites from the Earth Observation Group, Payne Institute for Public Policy, Colorado School of Mines. Public domain.',
          'The monthly series uses VNL v1. The annual series uses VNL v2.1.',
        ],
      },
      {
        heading: 'A zero is not darkness',
        body: [
          'The data producer states it themselves: in the monthly composites there are many areas where it is impossible to get good quality data coverage for that month, especially in the tropical regions, and it is therefore imperative that users utilise the cloud-free observations file and do not assume a value of zero in the average radiance image means that no lights were observed.',
          'Indonesia is close to the worst case on Earth for cloud cover. So the cloud-free observation count travels with every radiance value on this site, inside the same record, and a month with no observations is never drawn like a month that was dark.',
        ],
      },
      {
        heading: 'Monthly composites are unfiltered',
        body: [
          'The version 1 monthly composites have not been screened for aurora, fires, boats and other temporal lights. Only the annual composites carry layers removing temporal lights and background.',
          'For Indonesia that leaves two large contaminants inside the monthly data: one of the world’s largest light-fishing fleets, and peat fires — the 2015 and 2019 haze events appear as vast bright anomalies across Sumatra and Kalimantan.',
          'So source separation is the analysis here, not a cleanup step. The contamination markers on this site are computed from the difference between the monthly and annual composites, never hand-written.',
        ],
      },
      {
        heading: 'What light does not measure',
        body: [
          'Radiance is not a measure of an economy. The relationship is nonlinear and confounded by lighting technology, sensor view angle, land use and contamination.',
          'This site measures change in lit pixel share and mean radiance, and names it in those words. No ranking here is framed as a region succeeding or failing.',
        ],
      },
      {
        heading: 'The size constraint',
        body: [
          'Indonesia’s bounding box at 15 arc-second resolution holds roughly 45 million cells per layer, across more than 160 monthly layers since 2012. National monthly imagery cannot be shipped to a browser.',
          'So this site ships a downsampled annual composite for the browse map, and a roughly 44 km window at native resolution for each city, loaded only when that city is opened.',
        ],
      },
      {
        heading: 'What is not here',
        body: [
          'No real-time or recent-month monitoring: composites lag, and this is a historical record.',
          'No disaster or power-outage detection. That is an operational product and a wrong answer has real consequences.',
          'No DMSP-era data from 1992–2013, because splicing it onto VIIRS without intercalibration is a well-known error.',
        ],
      },
    ],
  },
  provenance: {
    syntheticTitle: 'This bundle was built from stand-in data',
    eogTitle: 'Data source',
  },
  footerNote:
    'This site shows light the satellite observed at night. The record is historical rather than current.',
}

const COPY: Record<Locale, Copy> = { id: ID, en: EN }

export function copyFor(locale: Locale): Copy {
  return COPY[locale]
}

export type { Copy }
