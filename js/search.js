/**
 * Fungsi pencarian dengan fuzzy search
 * Mencari kata kunci yang paling mirip dengan input user
 */

class NewsSearch {
    constructor() {
        this.beritaData = [];
        this.loadBerita();
    }

    /**
     * Load data berita dari JSON
     */
    async loadBerita() {
        try {
            const response = await fetch('data/berita.json');
            const data = await response.json();
            this.beritaData = data.berita;
        } catch (error) {
            console.error('Error loading berita:', error);
        }
    }

    /**
     * Hitung similarity antara dua string (Levenshtein distance)
     * Nilai 0 = sama persis, nilai tinggi = berbeda
     */
    calculateSimilarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = [];

        for (let i = 0; i <= len2; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= len1; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len2; i++) {
            for (let j = 1; j <= len1; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[len2][len1];
    }

    /**
     * Konversi similarity score menjadi persentase (0-100)
     * Semakin tinggi persentase, semakin mirip
     */
    getSimilarityScore(str1, str2) {
        const maxLen = Math.max(str1.length, str2.length);
        if (maxLen === 0) return 100;
        
        const distance = this.calculateSimilarity(str1.toLowerCase(), str2.toLowerCase());
        return Math.round((1 - distance / maxLen) * 100);
    }

    /**
     * Cari berita berdasarkan keyword
     * Mengembalikan array berita yang diurutkan berdasarkan relevansi
     */
    search(keyword) {
        if (!keyword || keyword.trim() === '') {
            return this.beritaData;
        }

        const results = this.beritaData.map(berita => {
            // Hitung similarity untuk judul, deskripsi, kategori, dan penulis
            const titleScore = this.getSimilarityScore(keyword, berita.judul);
            const descScore = this.getSimilarityScore(keyword, berita.deskripsi);
            const categoryScore = this.getSimilarityScore(keyword, berita.kategori);
            const authorScore = this.getSimilarityScore(keyword, berita.penulis);

            // Ambil score tertinggi
            const maxScore = Math.max(titleScore, descScore, categoryScore, authorScore);

            return {
                ...berita,
                relevanceScore: maxScore
            };
        });

        // Urutkan berdasarkan relevance score (tertinggi lebih dulu)
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    /**
     * Cari berdasarkan kategori
     */
    searchByCategory(category) {
        return this.beritaData.filter(berita => 
            berita.kategori.toLowerCase().includes(category.toLowerCase())
        );
    }

    /**
     * Cari berdasarkan tanggal
     */
    searchByDate(date) {
        return this.beritaData.filter(berita => berita.tanggal === date);
    }

    /**
     * Filter berita berdasarkan views minimum
     */
    filterByMinViews(minViews) {
        return this.beritaData.filter(berita => berita.views >= minViews);
    }

    /**
     * Dapatkan berita trending (views tertinggi)
     */
    getTrendingNews(limit = 5) {
        return this.beritaData
            .sort((a, b) => b.views - a.views)
            .slice(0, limit);
    }

    /**
     * Dapatkan berita terbaru
     */
    getLatestNews(limit = 5) {
        return this.beritaData
            .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
            .slice(0, limit);
    }
}

// Inisialisasi search engine
const newsSearch = new NewsSearch();
