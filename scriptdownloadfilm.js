class FilmDownloader {
    constructor() {
        this.dbName = 'FilmDatabase';
        this.dbVersion = 1;
        this.initDatabase();
    }

    // Inisialisasi IndexedDB
    initDatabase() {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Buat object store untuk film
            if (!db.objectStoreNames.contains('films')) {
                const store = db.createObjectStore('films', { 
                    keyPath: 'id',
                    autoIncrement: true 
                });
                
                // Buat index untuk pencarian
                store.createIndex('title', 'title', { unique: false });
                store.createIndex('url', 'url', { unique: true });
            }
        };

        request.onsuccess = (event) => {
            this.db = event.target.result;
            this.loadFilmsFromWebsite();
            this.displaySavedFilms();
        };
    }

    // Fungsi untuk mengambil daftar film dari website (contoh)
    async loadFilmsFromWebsite() {
        try {
            // Contoh: Ganti dengan URL website film yang ingin Anda scrap
            // const response = await fetch('https://website-film.com/api/films');
            // const films = await response.json();
            
            // Data contoh (ganti dengan data sebenarnya)
            const films = [
                {
                    id: 1,
                    title: "Film Contoh 1",
                    url: "https://example.com/film1.mp4",
                    thumbnail: "https://example.com/thumb1.jpg",
                    size: "1.2GB"
                },
                {
                    id: 2,
                    title: "Film Contoh 2", 
                    url: "https://example.com/film2.mp4",
                    thumbnail: "https://example.com/thumb2.jpg",
                    size: "2.1GB"
                }
            ];

            this.displayFilms(films);
        } catch (error) {
            console.error('Error loading films:', error);
        }
    }

    // Menampilkan daftar film
    displayFilms(films) {
        const filmList = document.getElementById('film-list');
        filmList.innerHTML = '';

        films.forEach(film => {
            const filmElement = document.createElement('div');
            filmElement.className = 'film-item';
            filmElement.innerHTML = `
                <h3>${film.title}</h3>
                <p>Size: ${film.size}</p>
                <button onclick="downloader.downloadFilm(${film.id}, '${film.title}', '${film.url}')">
                    Download
                </button>
            `;
            filmList.appendChild(filmElement);
        });
    }

    // Download film dan simpan ke IndexedDB
    async downloadFilm(id, title, url) {
        try {
            console.log(`Memulai download: ${title}`);
            
            // Buat elemen progress bar
            const progressId = `progress-${id}`;
            const filmElement = document.querySelector(`button[onclick*="${id}"]`).parentNode;
            filmElement.innerHTML += `
                <div class="progress-bar">
                    <div id="${progressId}" class="progress"></div>
                </div>
                <div id="status-${id}">Mempersiapkan download...</div>
            `;

            const response = await fetch(url);
            const contentLength = response.headers.get('content-length');
            const totalSize = parseInt(contentLength, 10);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            let receivedLength = 0;
            let chunks = [];
            
            while(true) {
                const {done, value} = await reader.read();
                
                if (done) {
                    break;
                }
                
                chunks.push(value);
                receivedLength += value.length;
                
                // Update progress bar
                const progressPercent = (receivedLength / totalSize) * 100;
                document.getElementById(progressId).style.width = progressPercent + '%';
                document.getElementById(`status-${id}`).textContent = 
                    `Downloading: ${Math.round(progressPercent)}% (${this.formatBytes(receivedLength)}/${this.formatBytes(totalSize)})`;
            }
            
            // Gabungkan semua chunks
            const blob = new Blob(chunks);
            
            // Simpan ke IndexedDB
            await this.saveFilmToDB({
                id: Date.now(), // ID unik
                originalId: id,
                title: title,
                url: url,
                blob: blob,
                size: this.formatBytes(blob.size),
                downloadDate: new Date().toISOString()
            });
            
            document.getElementById(`status-${id}`).textContent = 'Download selesai!';
            this.displaySavedFilms();
            
        } catch (error) {
            console.error('Download error:', error);
            document.getElementById(`status-${id}`).textContent = `Error: ${error.message}`;
        }
    }

    // Simpan film ke IndexedDB
    async saveFilmToDB(filmData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['films'], 'readwrite');
            const store = transaction.objectStore('films');
            
            const request = store.add(filmData);
            
            request.onsuccess = () => {
                console.log('Film disimpan ke database');
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // Tampilkan film yang sudah disimpan
    async displaySavedFilms() {
        const savedFilmsDiv = document.getElementById('saved-films');
        const films = await this.getAllFilms();
        
        savedFilmsDiv.innerHTML = '<h3>Film Tersimpan</h3>';
        
        if (films.length === 0) {
            savedFilmsDiv.innerHTML += '<p>Belum ada film yang disimpan</p>';
            return;
        }
        
        films.forEach(film => {
            const filmElement = document.createElement('div');
            filmElement.className = 'film-item';
            filmElement.innerHTML = `
                <h4>${film.title}</h4>
                <p>Size: ${film.size}</p>
                <p>Download: ${new Date(film.downloadDate).toLocaleDateString()}</p>
                <button onclick="downloader.playFilm(${film.id})">Putar</button>
                <button onclick="downloader.deleteFilm(${film.id})">Hapus</button>
            `;
            savedFilmsDiv.appendChild(filmElement);
        });
    }

    // Ambil semua film dari IndexedDB
    async getAllFilms() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['films'], 'readonly');
            const store = transaction.objectStore('films');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // Putar film yang sudah didownload
    async playFilm(filmId) {
        const film = await this.getFilm(filmId);
        if (film && film.blob) {
            const url = URL.createObjectURL(film.blob);
            window.open(url, '_blank');
        }
    }

    // Ambil film tertentu dari IndexedDB
    async getFilm(filmId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['films'], 'readonly');
            const store = transaction.objectStore('films');
            const request = store.get(filmId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // Hapus film dari IndexedDB
    async deleteFilm(filmId) {
        const transaction = this.db.transaction(['films'], 'readwrite');
        const store = transaction.objectStore('films');
        store.delete(filmId);
        
        transaction.oncomplete = () => {
            this.displaySavedFilms();
        };
    }

    // Format bytes ke format yang lebih mudah dibaca
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}

// Inisialisasi downloader
const downloader = new FilmDownloader();
