let mediaRecorder;
let audioChunks = [];

document.getElementById("start-recording").addEventListener("click", async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        const response = await fetch("/analyze", { method: "POST", body: formData });
        const result = await response.json();

        document.getElementById("stutter-result").innerText = `Stutter in voice: ${result.stutter}`;
        document.getElementById("type-result").innerText = `Type of stutter: ${result.type}`;

        audioChunks = [];
    };

    mediaRecorder.start();
    document.getElementById("start-recording").disabled = true;
    document.getElementById("stop-recording").disabled = false;
});

document.getElementById("stop-recording").addEventListener("click", () => {
    mediaRecorder.stop();
    document.getElementById("start-recording").disabled = false;
    document.getElementById("stop-recording").disabled = true;
});
