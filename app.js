/* =====================================================
   GENERAL
===================================================== */

function toggleMenu() {

    const nav =
        document.getElementById("mainNav");

    if (nav) {
        nav.classList.toggle("show");
    }

}


function toggleElement(id) {

    const element =
        document.getElementById(id);

    if (element) {
        element.classList.toggle("hidden");
    }

}


function escapeHTML(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =====================================================
   AGE HELPERS
===================================================== */

/*
   Converts years and months into a readable age.

   Examples:
   0 years, 6 months
   = 6 months old

   1 year, 0 months
   = 1 year old

   2 years, 3 months
   = 2 years 3 months old
*/

function formatPetAge(years, months) {

    years = Number(years) || 0;
    months = Number(months) || 0;

    if (months < 0) {
        months = 0;
    }

    if (months > 11) {
        months = 11;
    }

    const parts = [];

    if (years > 0) {

        parts.push(
            years === 1
                ? "1 year"
                : `${years} years`
        );

    }

    if (months > 0) {

        parts.push(
            months === 1
                ? "1 month"
                : `${months} months`
        );

    }

    if (parts.length === 0) {
        return "0 months old";
    }

    return parts.join(" ") + " old";
}


/*
   Gets the age from a Firestore record.

   New records:
   ageYears + ageMonths

   Old records:
   age

   This keeps older Firebase records working.
*/

function getPetAgeText(pet) {

    if (
        pet.ageYears !== undefined ||
        pet.ageMonths !== undefined
    ) {

        return formatPetAge(
            pet.ageYears,
            pet.ageMonths
        );

    }

    return pet.age || "-";
}


/*
   Safely gets a number from an input.
*/

function getNumberValue(id) {

    const element =
        document.getElementById(id);

    if (!element) {
        return 0;
    }

    return Number(element.value) || 0;
}


/* =====================================================
   REGISTRY
===================================================== */

let editingPetId = null;

const registryForm = document.getElementById("registryFormElement");

if (registryForm) {
    registryForm.addEventListener("submit", async event => {
        event.preventDefault();
        const ageYears = getNumberValue("registryAgeYears");
        const ageMonths = getNumberValue("registryAgeMonths");
        if (ageYears < 0 || ageMonths < 0 || ageMonths > 11) {
            alert("Please enter a valid age. Months must be from 0 to 11.");
            return;
        }
        const speciesSelect = document.getElementById("registrySpecies");
        const otherSpecies = document.getElementById("registryOtherSpecies");
        let species = speciesSelect ? speciesSelect.value : "";
        if (species === "Other") {
            species = otherSpecies ? otherSpecies.value.trim() : "";
            if (!species) {
                alert("Please specify the animal species.");
                if (otherSpecies) otherSpecies.focus();
                return;
            }
        }
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            alert("Please log in before registering a pet.");
            window.location.href = (window.location.pathname.includes("/modules/") ? "../" : "") + "login.html";
            return;
        }
        const isAdmin = window.currentUserRole === "admin";
        const existingPet = editingPetId ? registryData.find(item => item.id === editingPetId) : null;
        if (editingPetId && (!existingPet || (!isAdmin && existingPet.ownerUid !== currentUser.uid))) {
            alert("You can only edit your own pet records.");
            return;
        }
        const petData = {
            ownerUid: existingPet?.ownerUid || currentUser.uid,
            ownerEmail: existingPet?.ownerEmail || currentUser.email || "",
            ownerName: document.getElementById("ownerName").value.trim(),
            contactNumber: document.getElementById("contactNumber").value.trim(),
            ownerBarangay: document.getElementById("registryBarangay").value,
            ownerAddress: document.getElementById("registryOwnerAddress").value.trim(),
            petName: document.getElementById("registryPetName").value.trim(),
            breed: document.getElementById("registryBreed").value.trim(),
            sex: document.getElementById("registrySex")?.value || "",
            ageYears,
            ageMonths,
            age: formatPetAge(ageYears, ageMonths),
            birthdate: document.getElementById("registryBirthdate").value,
            species,
            rabiesStatus: document.getElementById("rabiesStatus").value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        try {
            if (editingPetId) {
                await db.collection("pets").doc(editingPetId).update(petData);
                await db.collection("publicPetRegistry").doc(editingPetId).set({
                    ownerUid: petData.ownerUid,
                    petName: petData.petName,
                    age: petData.age,
                    ageYears: petData.ageYears,
                    ageMonths: petData.ageMonths,
                    rabiesStatus: petData.rabiesStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert("Pet record updated successfully.");
            } else {
                petData.accidentStatus = "No accident reported";
                petData.accidentDescription = "";
                petData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                const newPetRef = await db.collection("pets").add(petData);
                await db.collection("publicPetRegistry").doc(newPetRef.id).set({
                    ownerUid: petData.ownerUid,
                    petName: petData.petName,
                    age: petData.age,
                    ageYears: petData.ageYears,
                    ageMonths: petData.ageMonths,
                    rabiesStatus: petData.rabiesStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert("Pet registered successfully.");
            }
            editingPetId = null;
            registryForm.reset();
            const formPanel = document.getElementById("registryForm");
            if (formPanel) formPanel.classList.add("hidden");
            const submitButton = registryForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.textContent = "Register Pet";
            const cancelButton = document.getElementById("cancelPetEdit");
            if (cancelButton) cancelButton.classList.add("hidden");
            if (otherSpecies) otherSpecies.classList.add("hidden");
        } catch (error) {
            console.error("Pet save error:", error);
            const detail = error && (error.code || error.message) ? `\nDetails: ${error.code || error.message}` : "";
            alert("Unable to save the pet record. Please check your login and Firestore permissions." + detail);
        }
    });
}

function editPetRecord(id) {
    const pet = registryData.find(item => item.id === id);
    const user = firebase.auth().currentUser;
    if (!pet || !registryForm || !user) return;
    if (window.currentUserRole !== "admin" && pet.ownerUid !== user.uid) {
        alert("You can only edit your own pet records.");
        return;
    }
    editingPetId = id;
    document.getElementById("ownerName").value = pet.ownerName || "";
    document.getElementById("contactNumber").value = pet.contactNumber || "";
    document.getElementById("registryBarangay").value = pet.ownerBarangay || "";
    document.getElementById("registryOwnerAddress").value = pet.ownerAddress || "";
    document.getElementById("registryPetName").value = pet.petName || "";
    document.getElementById("registryBreed").value = pet.breed || "";
    if (document.getElementById("registrySex")) document.getElementById("registrySex").value = pet.sex || "";
    document.getElementById("registryAgeYears").value = pet.ageYears ?? 0;
    document.getElementById("registryAgeMonths").value = pet.ageMonths ?? 0;
    document.getElementById("registryBirthdate").value = pet.birthdate || "";
    document.getElementById("rabiesStatus").value = pet.rabiesStatus || "Unknown";
    const speciesSelect = document.getElementById("registrySpecies");
    const otherSpecies = document.getElementById("registryOtherSpecies");
    const knownSpecies = ["Dog", "Cat", "Bird", "Rabbit", "Other"];
    if (speciesSelect) {
        if (knownSpecies.includes(pet.species)) speciesSelect.value = pet.species;
        else { speciesSelect.value = "Other"; if (otherSpecies) otherSpecies.value = pet.species || ""; }
    }
    if (speciesSelect) speciesSelect.dispatchEvent(new Event("change"));
    if (otherSpecies && speciesSelect?.value === "Other") otherSpecies.value = knownSpecies.includes(pet.species) ? "" : (pet.species || "");
    document.getElementById("registryForm")?.classList.remove("hidden");
    const submitButton = registryForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.textContent = "Save Changes";
    document.getElementById("cancelPetEdit")?.classList.remove("hidden");
    document.getElementById("registryForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelPetEdit() {
    editingPetId = null;
    registryForm?.reset();
    const submitButton = registryForm?.querySelector('button[type="submit"]');
    if (submitButton) submitButton.textContent = "Register Pet";
    document.getElementById("cancelPetEdit")?.classList.add("hidden");
    document.getElementById("registryForm")?.classList.add("hidden");
}

async function deletePetRecord(id) {
    const pet = registryData.find(item => item.id === id);
    const user = firebase.auth().currentUser;
    if (!pet || !user) return;
    if (window.currentUserRole !== "admin") {
        alert("Only barangay administrators can delete pet registry records. Residents may edit their own records.");
        return;
    }
    if (!confirm(`Delete the registration for ${pet.petName || "this pet"}? This cannot be undone.`)) return;
    try {
        await db.collection("pets").doc(id).delete();
        await db.collection("publicPetRegistry").doc(id).delete().catch(() => {});
        alert("Pet record deleted.");
    } catch (error) {
        console.error("Pet delete error:", error);
        alert("Unable to delete this record. Please check administrator access and Firestore rules.");
    }
}

const registryTable =
    document.getElementById(
        "registryTable"
    );


let registryData = [];
let registryListenerStarted = false;
let registryPublicData = [];
let registryOwnData = [];
let registryIsAdmin = false;
function combineRegistryData() {
    const map = new Map();
    // Public mirror contains only the three fields residents may see for other people's pets.
    registryPublicData.forEach(pet => map.set(pet.id, { ...pet, isPublicOnly: true }));
    // Full documents are loaded only for admins or the signed-in owner's own records.
    registryOwnData.forEach(pet => map.set(pet.id, { ...pet, isPublicOnly: false }));
    registryData = Array.from(map.values());
    renderRegistry();
}
function startRegistryListener(user, role) {
    if (!registryTable || !user || registryListenerStarted) return;
    registryListenerStarted = true;
    registryIsAdmin = role === "admin";
    registryTable.innerHTML = '<tr><td colspan="10">Loading pet records...</td></tr>';

    db.collection("publicPetRegistry").onSnapshot(snapshot => {
        registryPublicData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isPublicOnly: true }));
        combineRegistryData();
    }, error => {
        console.error("Public registry error:", error);
        registryTable.innerHTML = '<tr><td colspan="10">Unable to load shared pet summaries. Check Firestore rules.</td></tr>';
    });

    const ownQuery = registryIsAdmin
        ? db.collection("pets")
        : db.collection("pets").where("ownerUid", "==", user.uid);
    let migratedExistingSummaries = false;
    ownQuery.onSnapshot(async snapshot => {
        registryOwnData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isPublicOnly: false }));
        combineRegistryData();

        // Admin-only one-time-on-page-load backfill for legacy records that predate
        // publicPetRegistry. Only the approved, non-sensitive summary fields are copied.
        if (registryIsAdmin && !migratedExistingSummaries) {
            migratedExistingSummaries = true;
            try {
                for (let start = 0; start < snapshot.docs.length; start += 400) {
                    const batch = db.batch();
                    snapshot.docs.slice(start, start + 400).forEach(doc => {
                        const pet = doc.data();
                        if (!pet.ownerUid) return;
                        batch.set(db.collection("publicPetRegistry").doc(doc.id), {
                            ownerUid: pet.ownerUid,
                            petName: typeof pet.petName === "string" ? pet.petName : "",
                            age: typeof pet.age === "string" ? pet.age : getPetAgeText(pet),
                            ageYears: Number(pet.ageYears) || 0,
                            ageMonths: Number(pet.ageMonths) || 0,
                            rabiesStatus: typeof pet.rabiesStatus === "string" ? pet.rabiesStatus : "Unknown",
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    });
                    await batch.commit();
                }
            } catch (migrationError) {
                console.error("Legacy public pet summary migration failed:", migrationError);
                alert("Some older pet records could not be shared. Check that the updated Firestore rules are published, then reload as an administrator.");
            }
        }
    }, error => {
        console.error("Private pet registry error:", error);
        // Keep public summaries visible even if the private owner query has no access.
        combineRegistryData();
    });
}
window.addEventListener("authReady", event => {
    const detail = event.detail || {};
    startRegistryListener(detail.user, detail.role || "user");
});

function renderRegistry() {

    if (!registryTable) {
        return;
    }


    const search =
        (
            document
                .getElementById(
                    "registrySearch"
                )
                ?.value || ""
        )
        .toLowerCase();


    registryTable.innerHTML = "";


    const filtered =
        registryData.filter(pet => {

            const currentUser = firebase.auth().currentUser;
            const canSeeFullRecord = registryIsAdmin || (currentUser && pet.ownerUid === currentUser.uid);
            const text = (canSeeFullRecord
                ? [pet.ownerName, pet.contactNumber, pet.petName, pet.breed, pet.sex,
                   getPetAgeText(pet), pet.birthdate, pet.species, pet.rabiesStatus, pet.accidentStatus]
                : [pet.petName, pet.age || getPetAgeText(pet), pet.rabiesStatus]
            ).join(" ").toLowerCase();


            return text.includes(search);

        });


    filtered.forEach(pet => {
        const row = document.createElement("tr");
        const currentUser = firebase.auth().currentUser;
        const canManage = !!currentUser && (window.currentUserRole === "admin" || pet.ownerUid === currentUser.uid);
        const canSeeFullRecord = registryIsAdmin || (!!currentUser && pet.ownerUid === currentUser.uid);
        row.innerHTML = `
            <td>${canSeeFullRecord ? escapeHTML(pet.ownerName || "-") : "Private"}</td>
            <td>${canSeeFullRecord ? escapeHTML(pet.contactNumber || "-") : "Private"}</td>
            <td>${escapeHTML(pet.petName || "-")}</td>
            <td>${canSeeFullRecord ? escapeHTML(pet.species || "-") : "Private"}</td>
            <td>${canSeeFullRecord ? escapeHTML(pet.breed || "-") : "Private"}</td>
            <td>${canSeeFullRecord ? escapeHTML(pet.sex || "-") : "Private"}</td>
            <td>${escapeHTML(pet.age || getPetAgeText(pet))}</td>
            <td>${canSeeFullRecord ? escapeHTML(pet.birthdate || "-") : "Private"}</td>
            <td>${escapeHTML(pet.rabiesStatus || "Unknown")}</td>
            <td class="registry-actions">${canManage ? `
                <button type="button" class="small-btn" onclick="editPetRecord('${pet.id}')">Edit</button>
                ${registryIsAdmin ? `<button type="button" class="small-btn delete-btn" onclick="deletePetRecord('${pet.id}')">Delete</button>` : ""}` : "View only"}
            </td>`;
        registryTable.appendChild(row);
    });

}


document
    .getElementById(
        "registrySearch"
    )
    ?.addEventListener(
        "input",
        renderRegistry
    );


async function reportRegistryAccident(id) {

    const description =
        prompt(
            "Describe the accident:"
        );


    if (!description) {
        return;
    }


    try {

        await db
            .collection("pets")
            .doc(id)
            .update({

                accidentStatus:
                    "Accident reported",

                accidentDescription:
                    description

            });

    } catch (error) {

        console.error(error);

        alert(
            "Unable to report accident."
        );

    }

}


/* =====================================================
   VACCINATION
===================================================== */

// Populate the vaccination pet dropdown after auth.js has resolved the user's role.
// Waiting for authReady avoids a race where Firebase auth fires before the admin role loads.
const vaccinationPetSelect = document.getElementById("petId");
if (vaccinationPetSelect) {
    let vaccinationPetsLoaded = false;
    async function loadVaccinationPetOptions(user, role) {
        if (vaccinationPetsLoaded) return;
        if (!user) {
            vaccinationPetSelect.innerHTML = '<option value="">Log in as an administrator</option>';
            return;
        }
        if (role !== "admin") {
            vaccinationPetSelect.innerHTML = '<option value="">Administrator access required</option>';
            return;
        }
        vaccinationPetSelect.innerHTML = '<option value="">Loading registered pets...</option>';
        try {
            const snapshot = await db.collection("pets").get();
            vaccinationPetSelect.innerHTML = '<option value="">Select a registered pet</option>';
            snapshot.forEach(doc => {
                const pet = doc.data();
                const name = pet.petName || pet.name || "Unnamed pet";
                const species = pet.species ? ` (${pet.species})` : "";
                const option = document.createElement("option");
                option.value = doc.id;
                option.textContent = name + species;
                option.dataset.petName = name;
                vaccinationPetSelect.appendChild(option);
            });
            if (snapshot.empty) vaccinationPetSelect.innerHTML = '<option value="">No registered pets found</option>';
            vaccinationPetsLoaded = true;
        } catch (error) {
            console.error("Unable to load registered pets for vaccination:", error);
            vaccinationPetSelect.innerHTML = '<option value="">Could not load pets — check Firestore rules and console</option>';
        }
    }
    window.addEventListener("authReady", event => {
        const detail = event.detail || {};
        loadVaccinationPetOptions(detail.user || null, detail.role || "user");
    });
    vaccinationPetSelect.addEventListener("change", () => {
        const selected = vaccinationPetSelect.selectedOptions[0];
        const nameInput = document.getElementById("petName");
        if (nameInput) nameInput.value = selected?.dataset.petName || "";
    });
}

const vaccinationForm =
    document.getElementById(
        "vaccinationFormElement"
    );


if (vaccinationForm) {

    vaccinationForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            try {

                await db
                    .collection("vaccinations")
                    .add({

                        petId: document.getElementById("petId").value,
                        petName: document.getElementById("petName").value || document.getElementById("petId").selectedOptions[0]?.textContent || "Unknown pet",

                        vaccineName:
                            document
                                .getElementById(
                                    "vaccineName"
                                )
                                .value,

                        dateAdministered:
                            document
                                .getElementById(
                                    "dateAdministered"
                                )
                                .value,

                        nextDue: document.getElementById("nextDue").value,
                        vaccinationBarangay: document.getElementById("vaccinationBarangay").value,
                        vaccinationAddress: document.getElementById("vaccinationAddress").value.trim(),

                        createdAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()

                    });


                alert(
                    "Vaccination record saved."
                );


                vaccinationForm.reset();


                document
                    .getElementById(
                        "vaccinationForm"
                    )
                    ?.classList
                    .add("hidden");


            } catch (error) {

                console.error(error);

                alert(
                    "Unable to save vaccination record."
                );

            }

        }
    );

}


const vaccinationTable =
    document.getElementById(
        "vaccinationTable"
    );


let vaccinationData = [];


if (vaccinationTable) {

    db.collection("vaccinations")
        .onSnapshot(snapshot => {

            vaccinationData = [];

            snapshot.forEach(doc => {

                vaccinationData.push({

                    id: doc.id,

                    ...doc.data()

                });

            });

            renderVaccinations();

        });

}


function renderVaccinations() {

    if (!vaccinationTable) {
        return;
    }


    const search =
        (
            document
                .getElementById(
                    "vaccinationSearch"
                )
                ?.value || ""
        )
        .toLowerCase();


    vaccinationTable.innerHTML = "";


    vaccinationData
        .filter(item =>
            JSON.stringify(item)
                .toLowerCase()
                .includes(search)
        )
        .forEach(item => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        item.petName || item.petId || "Unknown pet"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.vaccineName
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.dateAdministered
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.nextDue
                    )}
                </td>

            `;


            vaccinationTable.appendChild(
                row
            );

        });

}


document
    .getElementById(
        "vaccinationSearch"
    )
    ?.addEventListener(
        "input",
        renderVaccinations
    );


/* =====================================================
   BITE CASES
   Residents submit cases for review. A resident report is
   Admins can approve resident reports immediately, regardless of age.
   Admins may also publish reports directly and remove cases.
===================================================== */
const biteForm = document.getElementById("biteFormElement");
const biteList = document.getElementById("biteCaseList");

function escapeBite(value) {
    return escapeHTML(value == null ? "" : String(value));
}

function biteTimestamp(item) {
    if (item.createdAt && typeof item.createdAt.toDate === "function") return item.createdAt.toDate();
    if (item.createdAt instanceof Date) return item.createdAt;
    return null;
}

if (biteForm) {
    biteForm.addEventListener("submit", async event => {
        event.preventDefault();
        const user = window.currentAuthUser || (typeof auth !== "undefined" ? auth.currentUser : null);
        if (!user) {
            alert("Please log in before reporting a bite incident.");
            window.location.href = "../login.html";
            return;
        }
        const isAdmin = window.currentUserRole === "admin";
        const otherType = document.getElementById("animalType").value === "Other"
            ? document.getElementById("otherAnimalType").value.trim() : "";
        if (document.getElementById("animalType").value === "Other" && !otherType) {
            alert("Please specify the animal type.");
            return;
        }
        const submitButton = biteForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        try {
            const now = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("bitecases").add({
                victimName: document.getElementById("victimName").value.trim(),
                animalType: document.getElementById("animalType").value === "Other" ? otherType : document.getElementById("animalType").value,
                incidentDate: document.getElementById("incidentDate").value,
                incidentBarangay: document.getElementById("incidentBarangay").value,
                incidentAddress: document.getElementById("incidentAddress").value.trim(),
                reporterBarangay: document.getElementById("reporterBarangay").value,
                reporterAddress: document.getElementById("reporterAddress").value.trim(),
                description: document.getElementById("incidentDescription").value.trim(),
                reporterUid: user.uid,
                reporterEmail: user.email || "",
                createdAt: now,
                status: isAdmin ? "Published" : "Pending Review",
                publishedAt: isAdmin ? now : null,
                postedByAdmin: isAdmin,
                investigationNote: ""
            });
            alert(isAdmin
                ? "Bite case posted to the public list."
                : "Your report was submitted. It will remain hidden from the public list for at least 30 minutes and must be reviewed and approved by the barangay.");
            biteForm.reset();
            const otherGroup = document.getElementById("otherAnimalTypeGroup");
            if (otherGroup) otherGroup.classList.add("hidden");
            const panel = document.getElementById("biteForm");
            if (panel) panel.classList.add("hidden");
        } catch (error) {
            console.error("Unable to submit bite report:", error);
            alert("Unable to submit bite report: " + (error.message || error.code || "Please try again."));
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}

const animalTypeSelect = document.getElementById("animalType");
if (animalTypeSelect) {
    const otherGroup = document.getElementById("otherAnimalTypeGroup");
    const otherInput = document.getElementById("otherAnimalType");
    const syncOtherAnimalType = () => {
        const showOther = animalTypeSelect.value === "Other";
        if (otherGroup) otherGroup.classList.toggle("hidden", !showOther);
        if (otherInput) {
            otherInput.disabled = !showOther;
            otherInput.required = showOther;
            if (!showOther) otherInput.value = "";
        }
    };
    animalTypeSelect.addEventListener("change", syncOtherAnimalType);
    syncOtherAnimalType();
}

async function updateBiteCase(caseId, changes) {
    try {
        await db.collection("bitecases").doc(caseId).update(changes);
    } catch (error) {
        console.error("Unable to update bite case:", error);
        alert("Unable to update the bite case. Check your Firestore rules and try again.");
    }
}

async function removeBiteCase(caseId) {
    if (window.currentUserRole !== "admin") return;
    if (!confirm("Take this bite case down from the system? This cannot be undone.")) return;
    try {
        await db.collection("bitecases").doc(caseId).delete();
    } catch (error) {
        console.error("Unable to remove bite case:", error);
        alert("Only the barangay admin can take down a case.");
    }
}

function renderBiteCases(docs, isAdmin) {
    if (!biteList) return;
    biteList.innerHTML = "";
    if (!docs.length) {
        biteList.innerHTML = `<p>${isAdmin ? "No bite cases have been reported." : "No approved bite cases are currently available. Reports submitted by residents are reviewed privately by the barangay first."}</p>`;
        return;
    }
    docs.sort((a,b) => {
        const at = biteTimestamp(a.data());
        const bt = biteTimestamp(b.data());
        return (bt ? bt.getTime() : 0) - (at ? at.getTime() : 0);
    }).forEach(doc => {
        const item = doc.data();
        const card = document.createElement("article");
        card.className = "bite-card";
        const status = item.status || "Published";
        const created = biteTimestamp(item);
        const adminControls = isAdmin ? `
            <p><strong>Reporter:</strong> ${escapeBite(item.postedByAdmin ? "Barangay post" : (item.reporterEmail || "Resident report"))}</p>
            <p><strong>Status:</strong> ${escapeBite(status)}</p>
            ${status === "Pending Review" ? `<button type="button" class="primary-btn" data-bite-action="approve" data-id="${escapeBite(doc.id)}">Approve &amp; Publish</button>` : ""}
            ${status === "Published" ? `<button type="button" class="primary-btn" data-bite-action="investigated" data-id="${escapeBite(doc.id)}">Mark Investigated</button>` : ""}
            <button type="button" class="bite-takedown-btn" data-bite-action="remove" data-id="${escapeBite(doc.id)}">Take Down</button>
        ` : "";
        card.innerHTML = `
            <h3>${escapeBite(item.victimName || "Bite incident")}</h3>
            <p><strong>Animal:</strong> ${escapeBite(item.animalType || "Not specified")}</p>
            <p><strong>Incident date:</strong> ${escapeBite(item.incidentDate || "Not specified")}</p>
            <p>${escapeBite(item.description || "")}</p>
            ${isAdmin ? adminControls : `<p class="bite-status-public">Barangay status: ${escapeBite(status === "Investigated" ? "Investigation completed" : "Published")}</p>`}
        `;
        biteList.appendChild(card);
    });
    biteList.querySelectorAll("[data-bite-action]").forEach(button => {
        button.addEventListener("click", async () => {
            const id = button.dataset.id;
            const action = button.dataset.biteAction;
            if (action === "approve") {
                if (window.currentUserRole !== "admin") {
                    alert("Only a barangay administrator can approve a bite case.");
                    return;
                }
                await updateBiteCase(id, { status: "Published", publishedAt: firebase.firestore.FieldValue.serverTimestamp() });
            } else if (action === "investigated") {
                await updateBiteCase(id, { status: "Investigated", investigatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            } else if (action === "remove") {
                await removeBiteCase(id);
            }
        });
    });
}

if (biteList) {
    window.addEventListener("authReady", event => {
        const user = event.detail.user;
        const isAdmin = event.detail.role === "admin";
        if (isAdmin) {
            db.collection("bitecases").onSnapshot(snapshot => renderBiteCases(snapshot.docs, true), error => {
                console.error("Unable to load bite cases:", error);
                biteList.innerHTML = "<p>Unable to load bite cases. Check Firestore permissions.</p>";
            });
        } else {
            let publishedDocs = [];
            let ownDocs = [];
            const render = () => {
                const combined = new Map();
                publishedDocs.concat(ownDocs).forEach(doc => combined.set(doc.id, doc));
                const visible = Array.from(combined.values()).filter(doc => {
                    const item = doc.data();
                    return item.status === "Published" || item.status === "Investigated" || item.reporterUid === user.uid;
                });
                renderBiteCases(visible.filter(doc => ["Published", "Investigated"].includes(doc.data().status)), false);
            };
            // Query by publication status only. Older approved reports may not have publishedAt.
            // Firestore Rules below allow residents to read records only when their status is published.
            db.collection("bitecases").where("status", "in", ["Published", "Investigated"]).onSnapshot(snapshot => {
                publishedDocs = snapshot.docs; render();
            }, error => { console.error(error); biteList.innerHTML = "<p>Unable to load approved bite cases.</p>"; });
            db.collection("bitecases").where("reporterUid", "==", user.uid).onSnapshot(snapshot => {
                ownDocs = snapshot.docs; render();
            }, error => console.warn("Could not load your submitted bite reports:", error));
        }
    });
}

/* =====================================================
   MISSIONS
===================================================== */

function handleMissionCategoryChange() {

    const category =
        document.getElementById(
            "missionCategory"
        );

    const otherGroup =
        document.getElementById(
            "otherMissionCategoryGroup"
        );

    const otherInput =
        document.getElementById(
            "otherMissionCategory"
        );

    if (
        !category ||
        !otherGroup
    ) {
        return;
    }

    if (
        category.value === "Other"
    ) {

        otherGroup
            .classList
            .remove("hidden");

        if (otherInput) {
            otherInput.required = true;
        }

    } else {

        otherGroup
            .classList
            .add("hidden");

        if (otherInput) {
            otherInput.required = false;
            otherInput.value = "";
        }

    }
}


function updateMissionActionToggleLimit(changedInput) {
    const checks = Array.from(document.querySelectorAll(".mission-action-toggle"));
    const selected = checks.filter(input => input.checked);
    if (selected.length > 2 && changedInput) { changedInput.checked = false; alert("You can select a maximum of two options."); }
    const nowSelected = checks.filter(input => input.checked);
    checks.forEach(input => { input.disabled = !input.checked && nowSelected.length >= 2; });
    const message = document.getElementById("missionActionToggleMessage");
    if (message) message.textContent = `${nowSelected.length}/2 options selected. Choose at least one.`;
}
document.querySelectorAll(".mission-action-toggle").forEach(input => input.addEventListener("change", () => updateMissionActionToggleLimit(input)));

function formatMissionDateMDY(value) {
    if (!value) return "";
    const parts = String(value).split("-");
    return parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : String(value);
}
function submitterTypeSafeOrgName() { return document.getElementById("missionOrganizationName")?.value.trim() || ""; }
const missionForm = document.getElementById("missionFormElement");
if (missionForm) {
    missionForm.addEventListener("submit", async event => {
        event.preventDefault();
        const user = auth.currentUser;
        if (!user) { alert("Please log in before submitting a mission."); return; }
        const selectedCategory = document.getElementById("missionCategory").value;
        const category = selectedCategory === "Other" ? document.getElementById("otherMissionCategory").value.trim() : selectedCategory;
        if (!category) { alert("Please specify the other mission category."); return; }
        const editId = document.getElementById("missionEditId")?.value || "";
        const isAdmin = window.currentUserRole === "admin";
        const submitterType = document.getElementById("missionSubmitterType").value;
        // Missions are announcements only; resident registration/volunteer actions are disabled.
        const interactionTypes = ["view"];
        const data = {
            eventName: document.getElementById("eventName").value.trim(),
            eventDate: document.getElementById("eventDate").value,
            registrationDeadline: document.getElementById("missionRegistrationDeadline")?.value || "",
            interactionTypes,
            location: document.getElementById("missionLocation").value.trim(),
            locationBarangay: document.getElementById("missionLocationBarangay").value,
            locationPlace: document.getElementById("missionLocationPlace").value === "Other (specify)" ? document.getElementById("missionLocationOtherPlace").value.trim() : document.getElementById("missionLocationPlace").value,
            submitterBarangay: document.getElementById("missionSubmitterBarangay").value,
            submitterAddress: document.getElementById("missionSubmitterAddress").value.trim(),
            organizationName: submitterTypeSafeOrgName(),
            organizationRegistration: document.getElementById("missionOrganizationRegistration")?.value.trim() || "",
            organizationContact: document.getElementById("missionOrganizationContact")?.value.trim() || "",
            organizationPhone: document.getElementById("missionOrganizationPhone")?.value.trim() || "",
            organizationEmail: document.getElementById("missionOrganizationEmail")?.value.trim() || "",
            category,
            description: document.getElementById("missionDescription").value.trim(),
            submitterType,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        try {
            if (editId) {
                if (!isAdmin) { alert("Only a barangay administrator can edit a published mission."); return; }
                await db.collection("missions").doc(editId).update(data);
                alert("Mission update saved successfully.");
            } else {
                data.submitterUid = user.uid;
                data.submitterName = user.displayName || user.email || "Community member";
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                data.status = isAdmin ? "Approved" : "Pending";
                data.participantCount = 0;
                if (isAdmin) data.reviewedBy = user.uid;
                await db.collection("missions").add(data);
                if (!isAdmin) {
                    await db.collection("notifications").add({ recipientRole: "admin", senderUid: user.uid, title: "New mission proposal", message: `${submitterType} submitted a mission proposal for review.`, read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                }
                alert(isAdmin ? "Mission update published successfully." : "Mission proposal submitted. It will appear publicly after an administrator approves it.");
            }
            missionForm.reset();
            document.getElementById("missionEditId").value = "";
            document.getElementById("missionFormTitle").textContent = "Create Mission / Update";
            document.getElementById("missionSubmitButton").textContent = "Submit Mission";
            document.getElementById("cancelMissionEdit").style.display = "none";
            document.getElementById("missionForm").classList.add("hidden");
            document.querySelectorAll(".mission-action-toggle").forEach(input => { input.checked = false; input.disabled = false; });
            updateMissionActionToggleLimit();
            handleMissionCategoryChange();
        } catch (error) {
            console.error("Unable to save mission:", error);
            alert("Unable to save mission: " + (error.message || "Check Firestore permissions and try again."));
        }
    });
}
function cancelMissionEditMode() {
    if (!missionForm) return;
    missionForm.reset();
    document.getElementById("missionEditId").value = "";
    document.getElementById("missionFormTitle").textContent = "Create Mission / Update";
    document.getElementById("missionSubmitButton").textContent = "Submit Mission";
    document.getElementById("cancelMissionEdit").style.display = "none";
    document.getElementById("missionForm").classList.add("hidden");
    document.querySelectorAll(".mission-action-toggle").forEach(input => { input.checked = false; input.disabled = false; });
    updateMissionActionToggleLimit();
    handleMissionCategoryChange();
}
function editMission(id, mission) {
    if (window.currentUserRole !== "admin") return;
    document.getElementById("missionEditId").value = id;
    document.getElementById("eventName").value = mission.eventName || "";
    document.getElementById("eventDate").value = mission.eventDate || "";
    if (document.getElementById("missionRegistrationDeadline")) document.getElementById("missionRegistrationDeadline").value = mission.registrationDeadline || "";
    document.getElementById("missionLocation").value = mission.location || "";
    document.getElementById("missionLocationBarangay").value = mission.locationBarangay || "";
    document.getElementById("missionLocationBarangay").dispatchEvent(new Event("change"));
    document.getElementById("missionLocationPlace").value = mission.locationPlace || "";
    document.getElementById("missionLocationPlace").dispatchEvent(new Event("change"));
    document.getElementById("missionSubmitterBarangay").value = mission.submitterBarangay || "";
    document.getElementById("missionSubmitterAddress").value = mission.submitterAddress || "";
    document.getElementById("missionDescription").value = mission.description || "";
    document.querySelectorAll(".mission-action-toggle").forEach(input => { input.checked = (mission.interactionTypes || ["register", "volunteer"]).includes(input.value); });
    updateMissionActionToggleLimit();
    const knownCategories = ["Vaccination", "Pet Grooming", "Basic Vet Check-up", "Deworming Drive", "Free Pet Food Distribution", "Rescue", "Pet Adoption Fairs"];
    if (knownCategories.includes(mission.category)) {
        document.getElementById("missionCategory").value = mission.category;
        document.getElementById("otherMissionCategory").value = "";
    } else {
        document.getElementById("missionCategory").value = "Other";
        document.getElementById("otherMissionCategory").value = mission.category || "";
    }
    document.getElementById("missionSubmitterType").value = mission.submitterType || "Barangay Admin";
    document.getElementById("missionSubmitterType").dispatchEvent(new Event("change"));
    document.getElementById("missionOrganizationName").value = mission.organizationName || "";
    document.getElementById("missionOrganizationRegistration").value = mission.organizationRegistration || "";
    document.getElementById("missionOrganizationContact").value = mission.organizationContact || "";
    document.getElementById("missionOrganizationPhone").value = mission.organizationPhone || "";
    document.getElementById("missionOrganizationEmail").value = mission.organizationEmail || "";
    document.getElementById("missionFormTitle").textContent = "Edit Mission Update";
    document.getElementById("missionSubmitButton").textContent = "Save Mission Update";
    document.getElementById("cancelMissionEdit").style.display = "inline-block";
    document.getElementById("missionForm").classList.remove("hidden");
    handleMissionCategoryChange();
    document.getElementById("missionForm").scrollIntoView({behavior:"smooth", block:"start"});
}


async function viewMissionResponses(missionId, eventName) {
    if (!auth.currentUser) return;
    try {
        const snapshot = await db.collection("missionResponses").where("missionId", "==", missionId).get();
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => item.mode !== "participate");
        let modal = document.getElementById("missionResponsesModal");
        if (!modal) { modal = document.createElement("div"); modal.id = "missionResponsesModal"; modal.className = "mission-interest-backdrop"; modal.innerHTML = `<section class="mission-interest-dialog" role="dialog" aria-modal="true"><button type="button" class="mission-interest-close">×</button><h2>Mission Responses</h2><p id="missionResponsesEvent"></p><div id="missionResponsesContent"></div></section>`; document.body.appendChild(modal); modal.querySelector(".mission-interest-close").addEventListener("click", () => modal.classList.remove("visible")); modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("visible"); }); }
        modal.querySelector("#missionResponsesEvent").textContent = eventName;
        const content = modal.querySelector("#missionResponsesContent"); content.innerHTML = "";
        if (!items.length) content.innerHTML = "<p>No registrations or volunteer responses yet.</p>";
        items.forEach(item => { const article = document.createElement("article"); article.className = "mission-response-item"; const safe = value => escapeHTML(value || "—"); article.innerHTML = `<h3>${item.mode === "register" ? "Registration" : "Volunteer"} — ${safe(item.name)}</h3><p><strong>Contact:</strong> ${safe(item.phone)}</p><p><strong>Barangay:</strong> ${safe(item.barangay)}</p><p><strong>Address:</strong> ${safe(item.address)}</p><p><strong>Details:</strong> ${safe(item.extra)}</p>`; content.appendChild(article); });
        modal.classList.add("visible");
    } catch (error) { console.error(error); alert("Could not load mission responses. Check the Firestore rules."); }
}

async function handleMissionInterest(missionId, mission, action) {
    const user = auth.currentUser;
    if (!user) { alert("Please sign in to respond to a mission."); return; }
    if (action === "participate") {
        if (mission.submitterUid === user.uid) { alert("You are the organizer of this mission."); return; }
        const responseRef = db.collection("missionResponses").doc(`${missionId}_${user.uid}_participate`);
        try {
            const existing = await responseRef.get();
            if (existing.exists) { alert("Your participation has already been counted."); return; }
            const missionRef = db.collection("missions").doc(missionId);
            await db.runTransaction(async tx => {
                const current = await tx.get(missionRef);
                if (!current.exists || current.data().status !== "Approved") throw new Error("This mission is no longer available.");
                tx.set(responseRef, { missionId, mode: "participate", respondentUid: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                tx.update(missionRef, { participantCount: firebase.firestore.FieldValue.increment(1) });
            });
            // Notification is best-effort; it must not make a successful response look like a failure.
            if (mission.submitterUid) {
                try {
                    await db.collection("notifications").add({ recipientUid: mission.submitterUid, senderUid: user.uid, title: "Mission participation", message: `Someone clicked Participate for “${mission.eventName}”. Total participants: ${Number(mission.participantCount || 0) + 1}.`, read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                } catch (notificationError) {
                    console.warn("Participation saved, but organizer notification failed:", notificationError);
                }
            }
            alert("Your participation was counted.");
        } catch (error) { console.error(error); alert("Could not record participation: " + (error.message || "Please try again.")); }
        return;
    }
    const modalId = "missionInterestModal";
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement("div"); modal.id = modalId; modal.className = "mission-interest-backdrop"; modal.innerHTML = `<section class="mission-interest-dialog" role="dialog" aria-modal="true" aria-labelledby="missionInterestTitle"><button type="button" class="mission-interest-close" aria-label="Close">×</button><h2 id="missionInterestTitle">Mission Interest</h2><p id="missionInterestEvent"></p><form id="missionInterestForm"><div class="form-group"><label for="interestName">Full Name *</label><input id="interestName" required maxlength="120"></div><div class="form-group"><label for="interestPhone">Contact Number *</label><input id="interestPhone" type="tel" required maxlength="30"></div><div class="form-group"><label for="interestBarangay">Barangay *</label><select id="interestBarangay" required><option value="">Select barangay</option><option>San Andres (Poblacion)</option><option>Santo Domingo</option><option>San Isidro</option><option>San Juan</option><option>Santo Niño</option><option>Santa Rosa</option><option>San Roque</option></select></div><div class="form-group"><label for="interestAddress">Full Address *</label><input id="interestAddress" required maxlength="220" placeholder="House/unit, street, subdivision or village"></div><div class="form-group" id="interestExtraGroup"><label for="interestExtra" id="interestExtraLabel">Additional Information *</label><textarea id="interestExtra" required rows="3"></textarea></div><button class="primary-btn" type="submit">Submit</button><p id="missionInterestMessage" role="status"></p></form></section>`; document.body.appendChild(modal);
        modal.querySelector(".mission-interest-close").addEventListener("click", () => modal.classList.remove("visible")); modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("visible"); });
    }
    const form = modal.querySelector("#missionInterestForm");
    modal.querySelector("#missionInterestTitle").textContent = action === "register" ? "Register for Mission" : "Volunteer for Mission";
    modal.querySelector("#missionInterestEvent").textContent = mission.eventName;
    modal.querySelector("#interestExtraLabel").textContent = action === "register" ? "Number of attendees / notes *" : "Skills, availability, and how you can help *";
    modal.querySelector("#interestExtra").placeholder = action === "register" ? "Number attending and any notes" : "Describe how you can help organize";
    modal.classList.add("visible"); form.onsubmit = async event => {
        event.preventDefault(); const submitter = form.querySelector('button[type="submit"]'); submitter.disabled = true;
        try {
            const responseId = `${missionId}_${user.uid}_${action}`; const responseRef = db.collection("missionResponses").doc(responseId); const old = await responseRef.get(); if (old.exists) throw new Error("You have already submitted this response.");
            await responseRef.set({ missionId, mode: action, respondentUid: user.uid, name: modal.querySelector("#interestName").value.trim(), phone: modal.querySelector("#interestPhone").value.trim(), barangay: modal.querySelector("#interestBarangay").value, address: modal.querySelector("#interestAddress").value.trim(), extra: modal.querySelector("#interestExtra").value.trim(), createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            let notificationSent = false;
            if (mission.submitterUid) {
                try {
                    await db.collection("notifications").add({ recipientUid: mission.submitterUid, senderUid: user.uid, title: action === "register" ? "New mission registration" : "New mission volunteer", message: `${action === "register" ? "A resident registered for" : "A resident volunteered for"} “${mission.eventName}”. Open the mission responses to review their details.`, read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                    notificationSent = true;
                } catch (notificationError) {
                    console.warn("Mission response saved, but organizer notification failed:", notificationError);
                }
            }
            modal.querySelector("#missionInterestMessage").textContent = notificationSent ? "Submitted successfully. The organizer has been notified." : "Submitted successfully. The organizer may not receive a notification."; form.reset(); setTimeout(() => modal.classList.remove("visible"), 1800);
        } catch (error) { console.error(error); modal.querySelector("#missionInterestMessage").textContent = error.message || "Unable to submit. Please try again."; }
        finally { submitter.disabled = false; }
    };
}

const missionList =
    document.getElementById(
        "missionList"
    );


if (missionList) {

    db.collection("missions")
        .where("status", "==", "Approved")
        .onSnapshot(snapshot => {

            missionList.innerHTML = "";


            if (snapshot.empty) {

                missionList.innerHTML =
                    "<p>No missions available.</p>";

                return;

            }


            snapshot.forEach(doc => {

                const mission =
                    { id: doc.id, ...doc.data() };


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "mission-card";


                card.innerHTML = `

                    <div class="mission-date">

                        ${escapeHTML(
                            formatMissionDateMDY(mission.eventDate)
                        )}

                    </div>
                    ${mission.registrationDeadline ? `<p class="mission-deadline"><strong>Registration deadline:</strong> ${escapeHTML(formatMissionDateMDY(mission.registrationDeadline))}</p>` : ""}

                    <span class="mission-category">
                        ${escapeHTML(mission.category || "Community activity")}
                    </span>
                    <p class="mission-poster">Posted by: ${escapeHTML(mission.submitterType || "Community member")}</p>


                    <h2>

                        ${escapeHTML(
                            mission.eventName
                        )}

                    </h2>


                    <p>

                        ${escapeHTML(
                            mission.description
                        )}

                    </p>


                    <p>

                        📍

                        ${escapeHTML([mission.locationPlace, mission.locationBarangay, mission.location].filter(Boolean).join(", "))}

                    </p>


                `;


                const isMissionOwner = !!(auth.currentUser && mission.submitterUid && mission.submitterUid === auth.currentUser.uid);
                if (window.currentUserRole === "admin" || (auth.currentUser && auth.currentUser.uid === "rJfo8plRZnZ0c4SU9kJfUEmH5cC3")) {
                    const actionBox = document.createElement("div");
                    actionBox.className = "mission-admin-action-box";
                    const removeMissionButton = document.createElement("button");
                    removeMissionButton.type = "button";
                    removeMissionButton.className = "danger-btn";
                    removeMissionButton.textContent = "Take Down Mission";
                    removeMissionButton.addEventListener("click", async () => {
                        if (window.currentUserRole !== "admin" && !(auth.currentUser && auth.currentUser.uid === "rJfo8plRZnZ0c4SU9kJfUEmH5cC3")) { alert("Only an administrator can take down missions."); return; }
                        if (!confirm(`Take down the mission post "${mission.eventName || "this mission"}"? This cannot be undone.`)) return;
                        removeMissionButton.disabled = true;
                        removeMissionButton.textContent = "Taking Down…";
                        try {
                            await db.collection("missions").doc(doc.id).delete();
                            alert("Mission post taken down.");
                        } catch (error) {
                            console.error("Unable to take down mission:", error);
                            alert("Unable to take down the mission. Verify administrator permissions and Firestore rules.");
                            removeMissionButton.disabled = false;
                            removeMissionButton.textContent = "Take Down Mission";
                        }
                    });
                    actionBox.appendChild(removeMissionButton);
                    card.appendChild(actionBox);
                }
                missionList.appendChild(card);

            });

        });

}

/* =====================================================
   ADOPTION
===================================================== */

const addAdoptionForm =
    document.getElementById(
        "addAdoptionForm"
    );


if (addAdoptionForm) {

    addAdoptionForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const selected =
                document.querySelector(
                    'input[name="petImage"]:checked'
                );
            if (document.getElementById("animalType").value === "Other" && !document.getElementById("adoptionOtherAnimalType").value.trim()) { alert("Please specify the animal species."); document.getElementById("adoptionOtherAnimalType").focus(); return; }


            if (!selected) {

                alert(
                    "Please choose an image."
                );

                return;

            }


            const ageYears =
                getNumberValue(
                    "petAgeYears"
                );

            const ageMonths =
                getNumberValue(
                    "petAgeMonths"
                );


            if (
                ageYears < 0 ||
                ageMonths < 0 ||
                ageMonths > 11
            ) {

                alert(
                    "Please enter a valid age. Months must be from 0 to 11."
                );

                return;

            }


            try {

                await db
                    .collection("adoptions")
                    .add({

                        ownerUid: auth.currentUser.uid,
                        ownerEmail: auth.currentUser.email.toLowerCase(),

                        petName:
                            document
                                .getElementById(
                                    "petName"
                                )
                                .value
                                .trim(),

                        animalType: document.getElementById("animalType").value === "Other" ? document.getElementById("adoptionOtherAnimalType").value.trim() : document.getElementById("animalType").value,

                        sex:
                            document
                                .getElementById(
                                    "petSex"
                                )
                                .value,

                        ageYears:
                            ageYears,

                        ageMonths:
                            ageMonths,

                        age:
                            formatPetAge(
                                ageYears,
                                ageMonths
                            ),

                        breed:
                            document
                                .getElementById(
                                    "petBreed"
                                )
                                .value,

                        vaccinationStatus:
                            document
                                .getElementById(
                                    "vaccinationStatus"
                                )
                                .value,

                        description:
                            document
                                .getElementById(
                                    "petDescription"
                                )
                                .value,

                        ownerName:
                            document
                                .getElementById(
                                    "ownerName"
                                )
                                .value,

                        ownerContact:
                            document
                                .getElementById(
                                    "ownerContact"
                                )
                                .value,

                        ownerEmail:
                            document.getElementById("ownerEmail").value.toLowerCase(),
                        ownerBarangay: document.getElementById("adoptionOwnerBarangay").value,
                        ownerAddress: document.getElementById("adoptionOwnerAddress").value.trim(),
                        ownerPlace: document.getElementById("adoptionOwnerPlace").value === "Other (specify)" ? document.getElementById("adoptionOwnerOtherPlace").value.trim() : document.getElementById("adoptionOwnerPlace").value,

                        image:
                            getWebpAdoptionImageName(
                                selected.value
                            ),

                        status:
                            "Available",

                        createdAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()

                    });


                alert(
                    "Animal listed for adoption."
                );


                addAdoptionForm.reset();

                closeAdoptionForm();


            } catch (error) {

                console.error(error);

                alert(
                    "Unable to add adoption listing."
                );

            }

        }
    );

}


/* =====================================================
   ADOPTION IMAGE HELPERS
===================================================== */

function getWebpAdoptionImageName(
    imageName
) {

    const fileName =
        String(
            imageName || ""
        )
        .trim()
        .split("/")
        .pop()
        .split("\\")
        .pop();


    const converted =
        fileName.replace(
            /\.(png|jpe?g|webp)$/i,
            ".webp"
        );


    const allowedImages = [

        "dog.webp",

        "pup.webp",

        "cat.webp",

        "kit.webp"

    ];


    return allowedImages.includes(
        converted.toLowerCase()
    )
        ? converted
        : "dog.webp";
}


function getAdoptionImagePath(
    imageName
) {

    const defaultImage =
        "../Images/dog.webp";


    if (!imageName) {
        return defaultImage;
    }


    let fileName =
        String(imageName)
            .trim();


    fileName =
        fileName
            .split("/")
            .pop()
            .split("\\")
            .pop();


    fileName =
        fileName.replace(
            /\.(png|jpe?g)$/i,
            ".webp"
        );


    const allowedImages = [

        "dog.webp",

        "pup.webp",

        "cat.webp",

        "kit.webp"

    ];


    if (
        !allowedImages.includes(
            fileName.toLowerCase()
        )
    ) {

        return defaultImage;

    }


    return "../Images/" + fileName;
}


/* =====================================================
   ADOPTION FORM
===================================================== */

function openAdoptionForm() {

    document
        .getElementById(
            "adoptionForm"
        )
        ?.classList
        .remove("hidden");

}


function closeAdoptionForm() {

    document
        .getElementById(
            "adoptionForm"
        )
        ?.classList
        .add("hidden");

}


/* =====================================================
   ADOPTION LIST
===================================================== */

const adoptionList =
    document.getElementById(
        "adoptionList"
    );


if (adoptionList) {

    db.collection("adoptions")
        .onSnapshot(snapshot => {

            adoptionList.innerHTML = "";


            if (snapshot.empty) {

                adoptionList.innerHTML = `

                    <p class="empty-message">

                        No animals are currently listed
                        for adoption.

                    </p>

                `;

                return;

            }


            snapshot.forEach(doc => {

                const pet =
                    doc.data();


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "adoption-card";
                card.dataset.adoptionId = doc.id;


                const petName =
                    pet.petName ||
                    "Unnamed Animal";
                card.dataset.petName = petName;


                card.innerHTML = `

                    <img
                        class="adoption-image"
                        src="${getAdoptionImagePath(
                            pet.image
                        )}"
                        alt="${escapeHTML(
                            petName
                        )}"
                        onerror="
                            this.onerror=null;
                            this.src='../Images/dog.webp';
                        ">


                    <div class="adoption-card-body">

                        <h3>

                            ${escapeHTML(
                                petName
                            )}

                        </h3>


                        <div class="pet-details">

                            <span class="pet-tag">

                                ${
                                    pet.sex === "Male"
                                        ? "♂ Male"
                                        : "♀ Female"
                                }

                            </span>


                            <span class="pet-tag">

                                ${escapeHTML(
                                    pet.animalType
                                )}

                            </span>


                            <span class="pet-tag">

                                ${escapeHTML(
                                    getPetAgeText(pet)
                                )}

                            </span>


                            <span class="pet-tag">

                                ${escapeHTML(
                                    pet.breed
                                )}

                            </span>

                        </div>


                        <p class="vaccination-status">

                            Vaccination:

                            ${escapeHTML(
                                pet.vaccinationStatus
                            )}

                        </p>


                        <p>

                            ${escapeHTML(
                                pet.description ||
                                "No description."
                            )}

                        </p>


                        <p class="posted-by">
                            Posted by: ${escapeHTML(pet.ownerName || "Pet owner")}
                        </p>

                        <p class="adoption-status-label">
                            Status: <strong>${escapeHTML(pet.status || "Available")}</strong>
                        </p>

                        ${
                            auth.currentUser && pet.ownerUid === auth.currentUser.uid
                            ? `
                                <label for="adoptionStatus-${doc.id}">Update your listing status</label>
                                <select id="adoptionStatus-${doc.id}" class="adoption-status-select" onchange="updateAdoptionListingStatus('${doc.id}', this.value)">
                                    <option value="Available" ${(!pet.status || pet.status === "Available") ? "selected" : ""}>Available</option>
                                    <option value="Pending" ${pet.status === "Pending" ? "selected" : ""}>Pending</option>
                                    <option value="In Process" ${pet.status === "In Process" ? "selected" : ""}>In Process</option>
                                    <option value="Adopted" ${pet.status === "Adopted" ? "selected" : ""}>Adopted</option>
                                </select>
                            ` : ""
                        }

                        ${
                            auth.currentUser && pet.ownerUid === auth.currentUser.uid
                            ? ""
                            : (pet.status === "Available" || !pet.status)
                                ? `<button class="primary-btn full-btn" onclick="openRequestModal('${doc.id}', '${escapeHTML(petName).replace(/'/g, "\\'")}')">I WANT TO ADOPT</button>`
                                : `<div class="adopted-label">${pet.status === "Adopted" ? "Already Adopted" : escapeHTML(pet.status)}</div>`
                        }

                    </div>

                `;


                adoptionList.appendChild(
                    card
                );

            });
            syncAdoptionAdminButtons();

        });

}


// Add the admin take-down action after the user's role has finished loading.
// This avoids missing the button when the adoption snapshot arrives before authReady.
function syncAdoptionAdminButtons() {
    if (!adoptionList) return;
    const isAdmin = window.currentUserRole === "admin";

    adoptionList.querySelectorAll(".adoption-card").forEach(card => {
        const existingAction = card.querySelector(".adoption-admin-action-box");
        if (!isAdmin) {
            if (existingAction) existingAction.remove();
            return;
        }
        if (existingAction) return;

        const adoptionId = card.dataset.adoptionId;
        const petName = card.dataset.petName || "Unnamed Animal";
        if (!adoptionId) return;

        const actionBox = document.createElement("div");
        actionBox.className = "adoption-admin-action-box";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "danger-btn full-btn adoption-takedown-btn";
        button.textContent = "Take Down Listing";
        button.addEventListener("click", () => takeDownAdoptionListing(adoptionId, petName));

        actionBox.appendChild(button);
        const cardBody = card.querySelector(".adoption-card-body");
        if (cardBody) cardBody.appendChild(actionBox);
    });
}

window.addEventListener("authReady", syncAdoptionAdminButtons);

/* =====================================================
   ADOPTION LISTING STATUS AND ADMIN MODERATION
===================================================== */

async function updateAdoptionListingStatus(adoptionId, newStatus) {
    const allowedStatuses = ["Available", "Pending", "In Process", "Adopted"];
    if (!allowedStatuses.includes(newStatus)) {
        alert("Please choose a valid adoption status.");
        return;
    }
    const user = auth.currentUser;
    if (!user) {
        alert("Please sign in to update your adoption listing.");
        return;
    }
    try {
        const ref = db.collection("adoptions").doc(adoptionId);
        const snap = await ref.get();
        if (!snap.exists) throw new Error("This adoption listing no longer exists.");
        if (snap.data().ownerUid !== user.uid && window.currentUserRole !== "admin") {
            throw new Error("Only the listing owner or an administrator can change this status.");
        }
        await ref.update({ status: newStatus, statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        alert("Adoption listing status updated to " + newStatus + ".");
    } catch (error) {
        console.error("Unable to update adoption status:", error);
        alert(error.message || "Unable to update the adoption status. Please check your connection and permissions.");
        const select = document.getElementById("adoptionStatus-" + adoptionId);
        if (select) {
            const snap = await db.collection("adoptions").doc(adoptionId).get().catch(() => null);
            if (snap && snap.exists) select.value = snap.data().status || "Available";
        }
    }
}

async function takeDownAdoptionListing(adoptionId, petName) {
    if (window.currentUserRole !== "admin") {
        alert("Only an administrator can take down adoption listings.");
        return;
    }
    if (!confirm(`Take down the adoption listing for "${petName}"? This removes it from the public adoption list.`)) return;
    try {
        await db.collection("adoptions").doc(adoptionId).delete();
        alert("Adoption listing taken down.");
    } catch (error) {
        console.error("Unable to take down adoption listing:", error);
        alert("Unable to take down this listing. Please check Firestore permissions.");
    }
}


/* =====================================================
   ADOPTION REQUEST
===================================================== */

function openRequestModal(
    adoptionId,
    petName
) {

    document
        .getElementById(
            "requestAdoptionId"
        )
        .value =
            adoptionId;


    document
        .getElementById(
            "requestPetName"
        )
        .textContent =
            "You are interested in adopting " +
            petName +
            ".";


    document
        .getElementById(
            "requestModal"
        )
        .classList
        .remove("hidden");

}


function closeRequestModal() {

    document
        .getElementById(
            "requestModal"
        )
        ?.classList
        .add("hidden");

}


const requestForm =
    document.getElementById(
        "adoptionRequestForm"
    );


if (requestForm) {

    requestForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const adoptionId =
                document
                    .getElementById(
                        "requestAdoptionId"
                    )
                    .value;


            const applicantName =
                document
                    .getElementById(
                        "applicantName"
                    )
                    .value
                    .trim();


            const applicantEmail =
                document
                    .getElementById(
                        "applicantEmail"
                    )
                    .value
                    .trim()
                    .toLowerCase();


            const message =
                document
                    .getElementById(
                        "applicantMessage"
                    )
                    .value
                    .trim();


            try {

                const signedInUser = auth.currentUser;
                if (!signedInUser) {
                    alert("Please log in before sending an adoption request.");
                    return;
                }

                const adoptionSnapshot = await db.collection("adoptions").doc(adoptionId).get();
                if (!adoptionSnapshot.exists || !adoptionSnapshot.data().ownerUid) {
                    alert("This listing needs to be refreshed by its owner before requests can be sent. Please contact the system administrator if the problem continues.");
                    return;
                }
                const adoptionOwnerUid = adoptionSnapshot.data().ownerUid;
                const participants = [signedInUser.uid, adoptionOwnerUid];

                const request =
                    await db
                        .collection(
                            "adoptionRequests"
                        )
                        .add({

                            adoptionId,
                            applicantUid: signedInUser.uid,
                            ownerUid: adoptionOwnerUid,
                            participants,

                            applicantName,

                            applicantContact:
                                document
                                    .getElementById(
                                        "applicantContact"
                                    )
                                    .value,

                            applicantEmail,

                            applicantBarangay: document.getElementById("applicantBarangay").value,
                            applicantAddress: document.getElementById("applicantAddress").value.trim(),

                            reason:
                                document
                                    .getElementById(
                                        "adoptionReason"
                                    )
                                    .value,

                            initialMessage:
                                message,

                            status:
                                "Pending",

                            createdAt:
                                firebase.firestore
                                    .FieldValue
                                    .serverTimestamp()

                        });


                await db
                    .collection("messages")
                    .add({

                        adoptionId,
                        requestId: request.id,
                        senderUid: signedInUser.uid,
                        participants,

                        senderType:
                            "Applicant",

                        senderEmail:
                            applicantEmail,

                        senderName:
                            applicantName,

                        message,

                        createdAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()

                    });


                await db.collection("notifications").add({
                    recipientUid: adoptionOwnerUid,
                    senderUid: signedInUser.uid,
                    title: "New adoption request",
                    message: `${applicantName} sent an adoption request for ${adoptionSnapshot.data().petName || "your listing"}.`,
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert(
                    "Adoption request sent."
                );


                requestForm.reset();

                closeRequestModal();


                openMessageModal(

                    adoptionId,

                    request.id,

                    "Pet Owner",

                    "Applicant",

                    applicantEmail

                );


            } catch (error) {

                console.error(error);

                alert(
                    "Unable to send request."
                );

            }

        }
    );

}


/* =====================================================
   OWNER REQUESTS
===================================================== */

function openOwnerDashboard() {

    document
        .getElementById(
            "ownerModal"
        )
        ?.classList
        .remove("hidden");

}


function closeOwnerDashboard() {

    document
        .getElementById(
            "ownerModal"
        )
        ?.classList
        .add("hidden");

}


async function loadOwnerRequests() {

    const signedInUser = auth.currentUser;
    if (!signedInUser) {
        alert("Please log in to view adoption requests.");
        return;
    }

    const container =
        document.getElementById(
            "ownerRequestsList"
        );



    container.innerHTML =
        "Loading requests...";


    try {

        const pets =
            await db
                .collection("adoptions")
                .where(
                    "ownerUid",
                    "==",
                    signedInUser.uid
                )
                .get();


        if (pets.empty) {

            container.innerHTML =
                "No adoption listings found.";

            return;

        }


        container.innerHTML = "";

        // Query by owner only, then group requests by adoption listing in memory.
        // This avoids a composite-index requirement for ownerUid + adoptionId.
        const allOwnerRequests = await db
            .collection("adoptionRequests")
            .where("ownerUid", "==", signedInUser.uid)
            .get();

        for (const petDoc of pets.docs) {
            const requestsForPet = allOwnerRequests.docs.filter(
                requestDoc => requestDoc.data().adoptionId === petDoc.id
            );

            requestsForPet.forEach(
                requestDoc => {

                    const request =
                        requestDoc.data();


                    const pet =
                        petDoc.data();


                    const card =
                        document.createElement(
                            "div"
                        );


                    card.className =
                        "request-card";


                    card.innerHTML = `

                        <h3>

                            ${escapeHTML(
                                pet.petName ||
                                "Unnamed Animal"
                            )}

                        </h3>


                        <p>

                            <strong>
                                Applicant:
                            </strong>

                            ${escapeHTML(
                                request.applicantName
                            )}

                        </p>


                        <p>

                            <strong>
                                Contact:
                            </strong>

                            ${escapeHTML(
                                request.applicantContact
                            )}

                        </p>


                        <p>

                            <strong>
                                Barangay:
                            </strong>

                            ${escapeHTML(
                                request.applicantBarangay
                            )}

                        </p>


                        <p>

                            <strong>
                                Reason:
                            </strong>

                            ${escapeHTML(
                                request.reason
                            )}

                        </p>


                        <p>

                            <strong>
                                Message:
                            </strong>

                            ${escapeHTML(
                                request.initialMessage
                            )}

                        </p>


                        <button
                            class="primary-btn"
                            onclick="openMessageModal(
                                '${petDoc.id}',
                                '${requestDoc.id}',
                                '${escapeHTML(
                                    request.applicantName
                                )}',
                                'Owner',
                                '${escapeHTML(
                                    request.applicantEmail || ''
                                )}'
                            )">

                            Message Applicant

                        </button>

                    `;


                    container.appendChild(
                        card
                    );

                }
            );

        }


        if (!container.children.length) {

            container.innerHTML =
                "No adoption requests yet.";

        }


    } catch (error) {

        console.error("Unable to load adoption requests:", error);

        container.innerHTML =
            "Unable to load requests: " +
            (error && (error.code || error.message) ? (error.code || error.message) : "Unknown error") +
            ". Please check the Firebase error details if this continues.";

    }

}


/* =====================================================
   UPDATE ADOPTION REQUEST STATUS
===================================================== */

async function updateAdoptionRequestStatus(
    requestId,
    adoptionId,
    status
) {

    try {

        const requestSnapshot = await db.collection("adoptionRequests").doc(requestId).get();
        const requestData = requestSnapshot.exists ? requestSnapshot.data() : null;
        await db
            .collection(
                "adoptionRequests"
            )
            .doc(requestId)
            .update({ status: status });
        if (requestData && requestData.applicantUid) {
            await db.collection("notifications").add({
                recipientUid: requestData.applicantUid,
                senderUid: auth.currentUser.uid,
                title: "Adoption request updated",
                message: `Your adoption request status is now ${status}.`,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        if (status === "Approved") {

            await db
                .collection(
                    "adoptions"
                )
                .doc(adoptionId)
                .update({

                    status:
                        "Adopted"

                });

        }


        alert(
            "Request status updated."
        );


        loadOwnerRequests();


    } catch (error) {

        console.error(error);

        alert(
            "Unable to update request."
        );

    }

}


/* =====================================================
   MESSAGING
===================================================== */

let currentAdoptionId = null;

let currentRequestId = null;

let currentSenderType = null;

let currentSenderEmail = null;
let currentParticipants = [];

let unsubscribeMessages = null;


function openMessageModal(

    adoptionId,

    requestId,

    personName,

    senderType,

    senderEmail

) {

    currentAdoptionId =
        adoptionId;

    currentRequestId =
        requestId;

    currentSenderType =
        senderType;

    currentSenderEmail =
        senderEmail;


    document
        .getElementById(
            "messageTitle"
        )
        .textContent =
            "Messages with " +
            personName;


    document
        .getElementById(
            "messageModal"
        )
        .classList
        .remove("hidden");


    const signedInUser = auth.currentUser;
    db.collection("adoptionRequests").doc(requestId).get().then(requestDoc => {
        if (!requestDoc.exists) throw new Error("Adoption request not found.");
        const requestData = requestDoc.data();
        currentParticipants = Array.isArray(requestData.participants) ? requestData.participants : [];
        if (!signedInUser || !currentParticipants.includes(signedInUser.uid)) {
            throw new Error("You are not authorized to view this conversation.");
        }
        listenForMessages();
    }).catch(error => {
        console.error(error);
        const container = document.getElementById("messagesContainer");
        if (container) container.textContent = "Unable to load this conversation. Please check that you are signed in with the account involved in this request.";
    });

}


function closeMessageModal() {

    if (unsubscribeMessages) {

        unsubscribeMessages();

        unsubscribeMessages =
            null;

    }


    document
        .getElementById(
            "messageModal"
        )
        ?.classList
        .add("hidden");

}


function listenForMessages() {

    const container =
        document.getElementById(
            "messagesContainer"
        );


    if (!container) {
        return;
    }


    if (unsubscribeMessages) {

        unsubscribeMessages();

    }


    unsubscribeMessages =
        db
            .collection("messages")

            .where("participants", "array-contains", auth.currentUser.uid)

            .where(
                "adoptionId",
                "==",
                currentAdoptionId
            )

            .where(
                "requestId",
                "==",
                currentRequestId
            )

            .onSnapshot(

                snapshot => {

                    container.innerHTML = "";


                    const messages = [];


                    snapshot.forEach(
                        doc => {

                            messages.push(
                                doc.data()
                            );

                        }
                    );


                    messages.sort(
                        (a, b) => {

                            const aTime =
                                a.createdAt
                                    ? a.createdAt
                                        .toMillis()
                                    : 0;


                            const bTime =
                                b.createdAt
                                    ? b.createdAt
                                        .toMillis()
                                    : 0;


                            return (
                                aTime -
                                bTime
                            );

                        }
                    );


                    messages.forEach(
                        messageData => {

                            const div =
                                document
                                    .createElement(
                                        "div"
                                    );


                            div.className =
                                messageData.senderUid === (auth.currentUser && auth.currentUser.uid)
                                    ? "message mine"
                                    : "message theirs";


                            div.textContent =
                                messageData.message;


                            container.appendChild(
                                div
                            );

                        }
                    );


                    container.scrollTop =
                        container.scrollHeight;

                },

                error => {

                    console.error(error);

                    container.innerHTML = `

                        <p>
                            Unable to load messages.
                        </p>

                    `;

                }

            );

}


/* =====================================================
   SEND MESSAGE
===================================================== */

const messageForm =
    document.getElementById(
        "messageForm"
    );


if (messageForm) {

    messageForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const input =
                document.getElementById(
                    "messageInput"
                );


            const message =
                input.value.trim();


            if (!message) {
                return;
            }


            try {

                await db
                    .collection("messages")
                    .add({

                        adoptionId: currentAdoptionId,
                        senderUid: auth.currentUser.uid,
                        participants: currentParticipants,

                        requestId:
                            currentRequestId,

                        senderType:
                            currentSenderType,

                        senderEmail:
                            currentSenderEmail,

                        message,

                        createdAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()

                    });


                input.value = "";


            } catch (error) {

                console.error(error);

                alert(
                    "Unable to send message."
                );

            }

        }
    );

}

/* =====================================================
   MISSION PROPOSAL MODERATION (ADMIN ONLY)
===================================================== */
function loadPendingMissionsForAdmin() {
    const container = document.getElementById("pendingMissionList");
    if (!container || window.currentUserRole !== "admin") return;
    db.collection("missions").where("status", "==", "Pending").onSnapshot(snapshot => {
        if (snapshot.empty) { container.innerHTML = '<p>No pending proposals.</p>'; return; }
        container.innerHTML = "";
        snapshot.forEach(doc => {
            const m = doc.data();
            const card = document.createElement("article");
            card.className = "dashboard-list-item";
            card.innerHTML = `<h3>${escapeHTML(m.eventName || "Mission proposal")}</h3><p>${escapeHTML(m.category || "")} · ${escapeHTML(m.eventDate || "")}</p><p>${escapeHTML([m.locationPlace, m.locationBarangay, m.location].filter(Boolean).join(", "))}</p><p>${escapeHTML(m.description || "")}</p><p>Submitted by: ${escapeHTML(m.submitterName || "Community member")} · ${escapeHTML(m.submitterType || "Not specified")}</p><div class="form-actions"><button class="primary-btn" type="button" data-action="approve">Approve</button><button class="secondary-btn" type="button" data-action="reject">Reject</button></div>`;
            card.querySelector('[data-action="approve"]').addEventListener("click", () => moderateMission(doc.id, m, "Approved"));
            card.querySelector('[data-action="reject"]').addEventListener("click", () => moderateMission(doc.id, m, "Rejected"));
            container.appendChild(card);
        });
    }, error => { console.error(error); container.textContent = "Unable to load proposals. Check Firestore rules."; });
}
async function moderateMission(id, mission, status) {
    if (window.currentUserRole !== "admin") { alert("Administrator access required."); return; }
    try {
        await db.collection("missions").doc(id).update({ status: status, reviewedAt: firebase.firestore.FieldValue.serverTimestamp(), reviewedBy: auth.currentUser.uid });
        if (mission.submitterUid) {
            await db.collection("notifications").add({ recipientUid: mission.submitterUid, senderUid: auth.currentUser.uid, title: status === "Approved" ? "Mission proposal approved" : "Mission proposal update", message: status === "Approved" ? `Your proposal “${mission.eventName || "Mission"}” has been approved and is now visible to the community.` : `Your proposal “${mission.eventName || "Mission"}” was not approved. You may contact the barangay office for details.`, read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
        if (status === "Approved") {
            await db.collection("recentActivity").add({ actorUid: auth.currentUser.uid, title: mission.eventName || "New animal welfare mission", description: `${mission.category || "Community activity"} at ${mission.location || "the barangay"} on ${mission.eventDate || "a date to be announced"}.`, category: "Approved mission", createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
        alert(status === "Approved" ? "Mission approved." : "Mission proposal rejected.");
    } catch (error) { console.error(error); alert("Unable to update proposal. Check administrator permissions and Firestore rules."); }
}
window.addEventListener("authReady", event => {
    window.currentUserRole = event.detail && event.detail.role || "user";
    if (window.currentUserRole === "admin") loadPendingMissionsForAdmin();
});


/* =====================================================
   COMMUNITY NEWS
   Publicly visible news; only administrators can publish.
===================================================== */
(function initCommunityNews(){
    function formatNewsDate(value){
        if(value && typeof value.toDate === "function") return value.toDate().toLocaleDateString();
        return value ? String(value) : "Date not specified";
    }
    function makeNewsCard(item){
        const card=document.createElement("article"); card.className="news-card";
        const category=escapeHTML(item.category || "Announcement");
        const headline=escapeHTML(item.headline || "Community update");
        const description=escapeHTML(item.description || "");
        const rawDate = item.when || formatNewsDate(item.createdAt);
        const dateText=escapeHTML(/^\d{4}-\d{2}-\d{2}$/.test(String(rawDate)) ? `${String(rawDate).slice(5,7)}/${String(rawDate).slice(8,10)}/${String(rawDate).slice(0,4)}` : rawDate);
        const timeText=escapeHTML(item.happeningTime || "Time not specified");
        const where=escapeHTML(item.where || [item.address, item.barangay].filter(Boolean).join(", ") || "Location not specified");
        const postedBy=escapeHTML(item.postedBy || "Barangay Animal Health System");
        card.innerHTML=`<span class="news-category">${category}</span><h3>${headline}</h3><p>${description}</p><p class="news-meta">📅 ${dateText} · ${timeText}<br>📍 ${where}<br>Posted by ${postedBy}</p>`;
        if (window.currentUserRole === "admin" && item.id) {
            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "danger-btn news-takedown-btn";
            removeButton.textContent = "Take Down News";
            removeButton.addEventListener("click", async () => {
                if (window.currentUserRole !== "admin") { alert("Only an administrator can take down news posts."); return; }
                if (!confirm(`Take down the news post "${item.headline || "this post"}"? This cannot be undone.`)) return;
                try { await db.collection("news").doc(item.id).delete(); alert("News post taken down."); }
                catch (error) { console.error("Unable to take down news:", error); alert("Unable to take down this news post. Verify administrator permissions and Firestore rules."); }
            });
            const actionBox = document.createElement("div");
            actionBox.className = "news-admin-action-box";
            actionBox.appendChild(removeButton);
            card.appendChild(actionBox);
        }
        return card;
    }
    function attachNewsList(element){
        if(!element) return;
        // firebase.js declares `const db` at top level; it is available to this
        // classic script but is not necessarily exposed as `window.db`.
        // Do not test window.db here, or the news listener silently never starts.
        if (typeof db === "undefined" || !db || typeof db.collection !== "function") {
            element.innerHTML = '<p class="news-load-error"><strong>News cannot start.</strong><br>Firebase is not initialized on this page. Check that firebase-app.js, firebase-firestore.js, firebase.js, and app.js load in that order.</p>';
            console.error("Community news: Firestore database variable is unavailable.");
            return;
        }
        // Read the collection first, then normalize legacy status values client-side.
        // This also supports older news documents that predate the status field.
        db.collection("news").onSnapshot(snapshot=>{
            const docs=snapshot.docs.map(doc=>({id:doc.id,...doc.data()})).filter(item=>{
                const status=String(item.status || "Published").trim().toLowerCase();
                return ["published", "approved", "live"].includes(status);
            });
            docs.sort((a,b)=>{const ta=a.createdAt&&a.createdAt.toMillis?a.createdAt.toMillis():0;const tb=b.createdAt&&b.createdAt.toMillis?b.createdAt.toMillis():0;return tb-ta;});
            element.innerHTML="";
            if(!docs.length){element.innerHTML='<p class="dashboard-muted">There are no published news updates yet. If the administrator has posted news, verify that the Firestore rules allow public reads.</p>';return;}
            docs.slice(0, element.id === "homeNewsList" ? 3 : 30).forEach(item=>element.appendChild(makeNewsCard(item)));
        },error=>{console.error("Unable to load community news:",error);element.innerHTML='<div class="news-load-error"><strong>News could not be loaded.</strong><p>Firebase denied or failed the news read. In Firebase Console → Firestore Database → Rules, publish the rule <code>match /news/{newsId} { allow read: if true; }</code> inside the database rules, then reload this page.</p><p class="news-error-detail">Error: '+escapeHTML(error.code || error.message || "Unknown Firebase error")+'</p></div>';});
    }
    document.addEventListener("DOMContentLoaded",()=>{
        attachNewsList(document.getElementById("homeNewsList"));
        attachNewsList(document.getElementById("newsList"));
        const panel=document.getElementById("newsAdminPanel"); const form=document.getElementById("newsForm");
        if(!panel || !form) return;
        const timeSelect = document.getElementById("newsTime");
        if (timeSelect && timeSelect.options.length <= 1) {
            for (let hour = 1; hour <= 12; hour++) {
                for (let minute = 0; minute < 60; minute += 15) {
                    for (const period of ["AM", "PM"]) {
                        const option = document.createElement("option");
                        option.value = `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")} ${period}`;
                        option.textContent = option.value;
                        timeSelect.appendChild(option);
                    }
                }
            }
        }
        // Resolve the admin role directly from Firestore as well as listening for authReady.
        // This avoids the news panel/submit guard getting stuck on the default "user" role
        // if authReady fired before this module attached its listener.
        const CONFIGURED_ADMIN_UID = "rJfo8plRZnZ0c4SU9kJfUEmH5cC3";
        async function resolveNewsAdmin(user) {
            if (!user) { panel.hidden = true; return false; }
            // Recognize the configured administrator before reading the profile document.
            // This prevents a denied/missing users-document read from blocking the known admin.
            if (user.uid === CONFIGURED_ADMIN_UID) {
                window.currentUserRole = "admin";
                panel.hidden = false;
                return true;
            }
            if (!window.db) { panel.hidden = true; return false; }
            try {
                const profile = await db.collection("users").doc(user.uid).get();
                const roleValue = profile.exists ? String(profile.data().role || "").trim().toLowerCase() : "";
                const isAdmin = roleValue === "admin";
                window.currentUserRole = isAdmin ? "admin" : "user";
                panel.hidden = !isAdmin;
                return isAdmin;
            } catch (error) {
                console.error("Unable to verify news administrator role:", error);
                panel.hidden = true;
                return false;
            }
        }
        window.addEventListener("authReady", event => {
            if (event.detail && event.detail.user) resolveNewsAdmin(event.detail.user);
        });
        if (window.auth && auth.currentUser) resolveNewsAdmin(auth.currentUser);
        if (window.auth) auth.onAuthStateChanged(user => { if (user) resolveNewsAdmin(user); else panel.hidden = true; });
        form.addEventListener("submit",async event=>{
            event.preventDefault();
            const user=window.auth && auth.currentUser;
            const verifiedAdmin = await resolveNewsAdmin(user);
            if(!user || !verifiedAdmin){alert("Administrator access was not verified. Check that this account's Firestore users document has role: \"admin\" and that Firestore rules are published.");return;}
            const button=form.querySelector('button[type="submit"]'); const message=document.getElementById("newsFormMessage");
            button.disabled=true; if(message) message.textContent="Publishing…";
            try{
                const dateValue=document.getElementById("newsWhen").value; const timeValue=document.getElementById("newsTime").value.trim().toUpperCase(); const barangayValue=document.getElementById("newsBarangay").value; const addressValue=document.getElementById("newsAddress").value.trim(); const whereValue=[addressValue,barangayValue].filter(Boolean).join(", "); await db.collection("news").add({headline:document.getElementById("newsHeadline").value.trim(),when:dateValue,happeningTime:timeValue,where:whereValue,barangay:barangayValue,address:addressValue,category:document.getElementById("newsCategory").value === "Other" ? document.getElementById("newsOtherCategory").value.trim() : document.getElementById("newsCategory").value,description:document.getElementById("newsDescription").value.trim(),postedBy:user.email || "Barangay Administrator",postedByUid:user.uid,status:"Published",createdAt:firebase.firestore.FieldValue.serverTimestamp()});
                form.reset(); if(message) message.textContent="News published successfully.";
            }catch(error){console.error(error);if(message) message.textContent="Could not publish. Check the news Firestore rules and administrator role.";}
            finally{button.disabled=false;}
        });
    });
})();
