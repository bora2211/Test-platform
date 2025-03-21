import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDoc, doc,getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
import "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

const firebaseConfig = {
    apiKey: "AIzaSyCR-nsO0Eibf9Fmba6zp0IeyNTiZ1YTNHQ",
    authDomain: "testcenter-2025.firebaseapp.com",
    projectId: "testcenter-2025",
    storageBucket: "testcenter-2025.firebasestorage.app",
    messagingSenderId: "446759343746",
    appId: "1:446759343746:web:9025b482329802cc34069b",
    measurementId: "G-0K3X6WSL09"
  };
  
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

const userNameElement = document.getElementById('userName');
const userImageElement = document.getElementById('userImage');
const logoutButton = document.getElementById('logout');
const fileInput = document.getElementById("fileInput");
const uploadButton = document.getElementById("uploadFile");

uploadButton.addEventListener("click", async () => {
    if (!fileInput.files.length) {
        alert("Моля, изберете файл.");
        return;
    }

    const file = fileInput.files[0];
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        await processExcel(file);
    } else {
        alert("Поддържат се само Excel файлове.");
    }
});

async function processExcel(file) {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        let successfulUploads = 0;
        let failedUploads = 0;
        const disciplineId = document.getElementById("discipline-select").value; 
        const questionBankIndex = document.getElementById("questionBank-select").value; 

        if (!disciplineId || !questionBankIndex) {
            alert("Моля, изберете дисциплина и банка с въпроси.");
            return;
        }

        try {
            const courseRef = doc(db, "courses", disciplineId);
            const courseSnapshot = await getDoc(courseRef);
            
            if (!courseSnapshot.exists()) {
                alert("Дисциплината не съществува.");
                return;
            }

            const courseData = courseSnapshot.data();
            const questionBanks = courseData.questionBanks;

            if (!questionBanks || questionBankIndex < 0 || questionBankIndex >= questionBanks.length) {
                alert("Избраната банка с въпроси не съществува.");
                return;
            }

            const selectedBank = questionBanks[questionBankIndex]; 

            for (const row of json) {
                if (!row.Въпрос || !row.Отговор1 || !row.Отговор2 || !row.Отговор3 || !row.Отговор4 || row.Верен === undefined) {
                    console.error("Пропуснати данни в ред:", row);
                    failedUploads++;
                    continue;
                }

                const options = [row.Отговор1, row.Отговор2, row.Отговор3, row.Отговор4];
                const correctIndex = parseInt(row.Верен);

                if (correctIndex < 0 || correctIndex >= options.length) {
                    console.error("Невалиден индекс за верен отговор в ред:", row);
                    failedUploads++;
                    continue;
                }

                const correctAnswer = options[correctIndex];

                selectedBank.questions.push({
                    question: row.Въпрос,
                    options,
                    correctAnswer
                });

                try {
                    await updateDoc(courseRef, {
                        questionBanks: questionBanks
                    });
                    successfulUploads++;
                } catch (e) {
                    console.error("Грешка при обновяване на дисциплината:", e);
                    failedUploads++;
                }
            }

            alert(`Успешно качени: ${successfulUploads}, Грешки: ${failedUploads}`);
        } catch (e) {
            console.error("Грешка при получаване на данни за дисциплината:", e);
            alert("Възникна грешка при обработката на дисциплината.");
        }
    };
}

window.onload = () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {

            window.location.href = 'login.html';
        }
    });
};
function displayUserInfo() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid)); 
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const firstName = userData.firstName || "Име";
                    const lastName = userData.lastName || "Фамилия";
                    const profilePic = userData.profilePic || "https://via.placeholder.com/40";

                    const fullName = firstName && lastName 
                        ? firstName + ' ' + lastName 
                        : user.email;

                    userNameElement.textContent = fullName;
                    userImageElement.src = profilePic;
                } else {
                    userNameElement.textContent = user.email;
                    userImageElement.src = "https://via.placeholder.com/40";
                }

                logoutButton.style.display = 'block';
            } catch (error) {
                console.error("Грешка при извличане на данни за потребителя:", error);
            }
        } else {
            userNameElement.textContent = "Не сте влезли";
            userImageElement.src = "https://via.placeholder.com/40";
            logoutButton.style.display = 'none';
        }
    });
}
logoutButton?.addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log('Потребителят излезе');
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Грешка при излизане:', error);
    });
});
displayUserInfo();
const form = document.getElementById("addQuestionForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const questionRaw = document.getElementById("question").value;
    const question = encodeURIComponent(questionRaw); 
    const option1 = document.getElementById("option1").value;
    const option2 = document.getElementById("option2").value;
    const option3 = document.getElementById("option3").value;
    const option4 = document.getElementById("option4").value;
    const correctIndex = parseInt(document.getElementById("correct").value);
    const disciplineId = document.getElementById("discipline-select").value;
    const questionBankIndex = document.getElementById("questionBank-select").value; 

    const options = [option1, option2, option3, option4];

    if (correctIndex < 0 || correctIndex >= options.length) {
        alert("Невалиден индекс за правилен отговор.");
        return;
    }

    const correctAnswer = options[correctIndex];

    try {
        const courseRef = doc(db, "courses", disciplineId);
        const courseSnapshot = await getDoc(courseRef);

        if (!courseSnapshot.exists()) {
            alert("Дисциплината не съществува!");
            return;
        }

        const courseData = courseSnapshot.data();
        const questionBanks = courseData.questionBanks;

        if (!questionBanks || questionBankIndex < 0 || questionBankIndex >= questionBanks.length) {
            alert("Избраната банка с въпроси не съществува!");
            return;
        }

        const selectedBank = questionBanks[questionBankIndex];
        selectedBank.questions.push({
            question,
            options,
            correctAnswer
        });
        await updateDoc(courseRef, {
            questionBanks: questionBanks
        });
        alert("Въпросът беше успешно добавен в банката с въпроси!");
        form.reset();
    } catch (error) {
        console.error("Грешка при добавяне на въпрос:", error);
        alert("Възникна грешка при добавянето на въпрос. Моля, опитайте отново.");
    }
});
document.addEventListener("DOMContentLoaded", function() {
    // Функция за зареждане на дисциплините
    async function loadDisciplines() {
        const disciplineSelect = document.getElementById("discipline-select");
        if (!disciplineSelect) {
            console.error('Не намерихме селекта за дисциплините!');
            return;
        }
        try {

            const coursesRef = collection(db, "courses");
            const querySnapshot = await getDocs(coursesRef);
            disciplineSelect.innerHTML = '<option value="">-- Изберете дисциплина --</option>';

            querySnapshot.forEach(doc => {
                const courseData = doc.data();
                const option = document.createElement("option");
                option.value = doc.id; 
                option.textContent = courseData.disciplineName;
                disciplineSelect.appendChild(option);
            });

        } catch (error) {
            console.error("Грешка при зареждане на дисциплините:", error);
        }
    }

    async function loadQuestionBanks(disciplineId) {
        const questionBankSelect = document.getElementById("questionBank-select");

        if (!questionBankSelect) {
            console.error('Не намерихме селекта за банките с въпроси!');
            return;
        }

        if (!disciplineId) {

            questionBankSelect.innerHTML = '<option value="">-- Изберете банка с въпроси --</option>';
            return;
        }

        try {
            const courseRef = doc(db, "courses", disciplineId);
            const courseSnapshot = await getDoc(courseRef);

            if (!courseSnapshot.exists()) {
                console.error("Дисциплината не съществува!");
                return;
            }

            const courseData = courseSnapshot.data();
            if (Array.isArray(courseData.questionBanks)) {
                const questionBanks = courseData.questionBanks;
                questionBankSelect.innerHTML = '<option value="">-- Изберете банка с въпроси --</option>';
                questionBanks.forEach((bank, index) => {
                    const option = document.createElement("option");
                    option.value = index;
                    option.textContent = bank.name; 
                    questionBankSelect.appendChild(option);
                });
            } else {
                console.error("Няма налични банки с въпроси за тази дисциплина.");
            }

        } catch (error) {
            console.error("Грешка при зареждане на банките с въпроси:", error);
        }
    }

    document.getElementById("discipline-select").addEventListener("change", (e) => {
        const selectedDisciplineId = e.target.value;
        loadQuestionBanks(selectedDisciplineId);
    });

    loadDisciplines();
});


