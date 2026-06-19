console.log("HOTNEWS Loaded!");

const headlines = [
    "Berita Paling Viral Hari Ini",
    "Topik Panas Yang Sedang Ramai",
    "Trending Nomor 1 Di Internet",
    "Netizen Sedang Membicarakan Ini"
];

let index = 0;

setInterval(() => {
    index++;

    if(index >= headlines.length){
        index = 0;
    }

    document.getElementById("headline-title").innerText =
        headlines[index];

}, 4000);