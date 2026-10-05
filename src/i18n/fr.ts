import type { MessageKey } from "./uk";

export const fr: Record<MessageKey, string> = {
  "app.tagline": "votre prochaine étape",
  "app.description":
    "Votre espace de recherche d’emploi : offres, CV et candidatures au même endroit.",
  "language.label": "Langue de l’interface",
  "env.stage": "Environnement de test",

  "common.refresh": "Actualiser",
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.done": "Terminé",
  "common.edit": "Modifier",
  "common.delete": "Supprimer",
  "common.restore": "Restaurer",
  "common.processing": "Traitement en cours…",
  "common.downloadCopy": "Télécharger une copie",
  "common.email": "Courriel",

  "date.notSet": "Non précisé",
  "date.never": "Pas encore mis à jour",

  "nav.discover": "Offres",
  "nav.saved": "Favoris",
  "nav.applications": "Mes candidatures",
  "nav.profile": "Mon profil",
  "nav.documents": "Documents",
  "nav.sources": "Sources",
  "nav.aria": "Navigation principale",
  "menu.open": "Ouvrir le menu",
  "menu.close": "Fermer le menu",
  "modal.close": "Fermer la fenêtre",
  "toast.close": "Fermer le message",
  "notice.hide": "Masquer le message",

  "stage.saved": "Enregistrée",
  "stage.reviewing": "À l’étude",
  "stage.prepared": "Documents prêts",
  "stage.submitted": "Envoyée",
  "stage.interview": "Entretien",
  "stage.offer": "Offre reçue",
  "stage.rejected": "Refus",
  "stage.withdrawn": "Retirée",

  "page.eyebrow": "UN EMPLOI QUI VOUS CONVIENT",
  "page.discover.title": "Trouvez votre prochaine étape",
  "page.discover.description":
    "Des possibilités où commence votre prochaine étape.",
  "page.saved.description":
    "Les offres intéressantes restent à portée de main quand vous êtes prête ou prêt à agir.",
  "page.applications.description":
    "Chaque candidature, la prochaine étape et le résultat au même endroit.",
  "page.profile.description":
    "Votre expérience est la base d’une candidature convaincante.",
  "page.documents.description":
    "Un dossier de documents distinct pour chaque possibilité.",
  "page.sources.description":
    "D’où viennent les offres et comment ajouter d’autres possibilités.",

  "brand.tagline": "VOTRE PROCHAINE ÉTAPE",
  "sidebar.mySpace": "MON ESPACE",
  "sidebar.tip.title1": "De petits pas.",
  "sidebar.tip.title2": "De nouvelles possibilités.",
  "sidebar.tip.text1": "Enregistrez une offre qui vous intéresse.",
  "sidebar.tip.text2": "La prochaine étape vous appartient.",
  "sidebar.tip.toSaved": "Voir les favoris",
  "sidebar.tip.addCv": "Ajouter mon CV",
  "breadcrumb.mySpace": "Mon espace",
  "account.mine": "Mon compte",
  "account.private": "Espace privé",
  "account.device": "Sur cet appareil",
  "footer.tagline": "Votre prochaine étape",
  "footer.privacy": "Conçu dans le respect de vos données",

  "sync.connect": "Activer la synchronisation",
  "sync.signIn": "Se connecter pour synchroniser",
  "sync.synced": "Tout est synchronisé",
  "sync.conflict": "Versions différentes des modifications",
  "sync.offline": "Modifications sur l’appareil",
  "sync.syncing": "Synchronisation…",
  "sync.heading": "Un seul espace sur tous vos appareils",
  "sync.text":
    "Connectez-vous avec le même courriel sur votre ordinateur et votre téléphone. Le profil, les favoris, les candidatures et les documents sont synchronisés.",
  "sync.unconfigured.title": "La connexion au stockage est en cours",
  "sync.unconfigured.text":
    "Le site fonctionne déjà. Pour la synchronisation, le propriétaire doit connecter un projet Supabase gratuit. D’ici là, les modifications restent sur cet appareil.",
  "sync.ownerGuide": "Guide pour le propriétaire",
  "sync.state.synced": "Toutes les modifications sont synchronisées",
  "sync.state.conflict": "Il faut choisir une version des modifications",
  "sync.state.offline": "En attente de connexion",
  "sync.lastUpdate": "Dernière mise à jour : {time}",
  "sync.privacy":
    "Les données personnelles ne sont accessibles qu’à votre compte. Le site public ne contient pas votre CV.",

  "conflict.title": "De nouvelles modifications existent sur un autre appareil",
  "conflict.text":
    "Une copie de sauvegarde sera enregistrée avant votre choix. Quelle version conserver dans l’espace commun ?",
  "conflict.remote": "Celle de l’autre appareil",
  "conflict.local": "Celle de cet appareil",

  "hero.pill": "VOTRE RECHERCHE COMMENCE ICI",
  "hero.title1": "Moins de chaos.",
  "hero.title2": "Plus de possibilités.",
  "hero.text1": "Les offres, votre expérience et les prochaines étapes —",
  "hero.text2": "réunies dans un espace pratique.",
  "hero.refine": "Préciser ma recherche",
  "hero.configure": "Configurer ma recherche",

  "stats.aria": "Aperçu de la recherche",
  "stats.feed.label": "Dans le fil Guichet-Emplois",
  "stats.feed.detail": "Dernier échantillon disponible",
  "stats.saved.label": "Enregistrées par vous",
  "stats.saved.detail": "Les possibilités qui vous intéressent",
  "stats.active.label": "Candidatures actives",
  "stats.active.detail": "Selon vos indications",
  "stats.packets.label": "Dossiers de documents",
  "stats.packets.detail": "CV et lettres de motivation",

  "jobs.savedTitle": "Possibilités enregistrées",
  "jobs.loading": "Chargement des offres…",
  "jobs.showMore": "Afficher plus ({count})",
  "search.aria": "Recherche d’offres",
  "search.placeholder": "Poste, entreprise ou ville…",
  "search.clear": "Effacer la recherche",
  "filter.sourceAria": "Source des offres",
  "filter.allSources": "Toutes les sources",
  "filter.myConditions": "Mes critères",
  "results.conditions": "Mes critères : {conditions}",
  "results.fromHourly": "à partir de {amount} $/h",
  "results.noLimits": "sans restriction",
  "results.all":
    "Tous les domaines sont affichés. Précisez la ville et les postes dans les paramètres.",
  "sort.aria": "Tri des offres",
  "sort.newest": "Les plus récentes",
  "sort.skills": "Par correspondances de compétences",

  "feed.loadError":
    "Impossible de charger le fil. Les offres enregistrées restent accessibles ; réessayez plus tard.",
  "feed.unavailable":
    "La mise à jour de Guichet-Emplois est temporairement indisponible. Les offres enregistrées restent dans votre espace.",
  "feed.copyFrom": "Copie du {time} affichée.",
  "feed.source": "Source :",
  "feed.footnote":
    "Mis à jour le {time}. Le fil contient un échantillon limité d’annonces, et non tout le marché. Vérifiez l’actualité dans l’annonce originale.",

  "empty.saved.title": "Enregistrez ce qui vous intéresse",
  "empty.saved.text":
    "Cliquez sur le signet d’une offre : elle restera ici, même après la mise à jour du fil.",
  "empty.matches.title": "Aucune correspondance pour l’instant",
  "empty.matches.text":
    "Il s’agit d’un échantillon limité d’annonces récentes. Modifiez les filtres, lancez une recherche dans les sources ou ajoutez une offre manuellement.",
  "empty.viewJobs": "Voir les offres",
  "empty.openSources": "Ouvrir les sources",

  "job.add": "Ajouter une offre",
  "job.untitled": "Sans titre",
  "job.noEmployer": "Employeur non précisé",
  "job.published": "Publiée le {date}",
  "job.found": "Trouvée le {date}",
  "job.savedAria": "Offre enregistrée {title}",
  "job.saveAria": "Enregistrer {title}",
  "job.noLocation": "Lieu non précisé",
  "job.noSalary": "Rémunération non précisée",
  "job.full": "Description complète",
  "job.snippet": "Description courte",
  "job.skillMatches": "Compétences correspondantes : {count}",
  "job.closed": "Fermée",
  "job.canPrepare": "Les documents peuvent être préparés",
  "job.checkOriginal": "Vérifiez les exigences dans l’annonce originale",
  "job.view": "Consulter",
  "source.manual": "Ajoutée manuellement",
  "source.rss": "Import RSS",

  "details.original": "Annonce originale",
  "details.description": "Description du poste",
  "details.cancelEdit": "Annuler la modification",
  "details.addFull": "Ajouter la description complète",
  "details.snippetNotice":
    "Le fil ne contient que des données succinctes. Ouvrez l’annonce originale et ajoutez la description complète avec les exigences pour préparer les documents.",
  "details.fullText": "Texte complet de l’annonce",
  "details.fullCheckbox":
    "Le texte contient la description complète et les exigences",
  "details.saveDescription": "Enregistrer la description",
  "details.noDescription": "Aucune description pour l’instant.",
  "details.matches": "Correspondances avec votre profil",
  "details.matchesNote":
    "Correspondances textuelles exactes de vos compétences confirmées. Elles ne vérifient ni le niveau de maîtrise ni toutes les exigences du poste.",
  "details.noMatches":
    "Aucune correspondance textuelle exacte pour l’instant. Cela ne signifie pas que votre expérience ne convient pas.",
  "details.addSkills":
    "Ajoutez des compétences confirmées à votre profil pour voir les correspondances textuelles.",
  "details.myStatus": "Statut de ma candidature",
  "details.notSaved": "Pas encore enregistrée",
  "details.notes": "Mes notes",
  "details.notesPlaceholder": "Une question, un contact ou la prochaine étape…",
  "details.submittedNote":
    "En indiquant « Envoyée », vous confirmez avoir transmis la candidature vous-même.",
  "details.bookmark": "Ajouter aux favoris",
  "details.prepare": "Préparer les documents",

  "pipeline.inList": "Dans votre liste",
  "pipeline.interviews": "Entretiens",
  "pipeline.offers": "Offres reçues",
  "applications.empty.title": "Votre recherche suit son propre parcours",
  "applications.empty.text":
    "Enregistrez une offre, préparez les documents et suivez les prochaines étapes. C’est vous qui indiquez les candidatures envoyées.",
  "applications.find": "Trouver une offre",
  "applications.statusAria": "Statut de la candidature {title}",
  "applications.note":
    "Ouvrir une annonce et préparer des documents n’envoie aucune candidature à l’employeur.",
  "table.job": "Offre",
  "table.status": "Statut",
  "table.updated": "Mise à jour",

  "sources.intro.title": "Plus de chemins vers votre emploi",
  "sources.intro.text":
    "Utilisez le fil Guichet-Emplois ou enregistrez des offres d’autres sites dans une liste commune.",
  "sources.jobbank.subtitle": "Portail d’emploi du gouvernement du Canada",
  "sources.jobbank.description":
    "Annonces dans le dernier échantillon : {count}. Mise à jour : {time}. La description complète s’ouvre sur le site de l’employeur ou de Guichet-Emplois.",
  "sources.status.unavailable": "Mise à jour indisponible",
  "sources.status.stale": "Copie précédente",
  "sources.status.ok": "Le fil fonctionne",
  "sources.status.checking": "Vérification du fil",
  "sources.external": "Recherche externe",
  "sources.indeed.subtitle": "Recherche et alertes par courriel",
  "sources.indeed.description":
    "Trouvez une offre ou configurez des alertes sur Indeed. Ajoutez le lien et le texte ici : le profil et les documents restent au même endroit.",
  "sources.jobillico.subtitle": "Offres et employeurs au Canada",
  "sources.jobillico.description":
    "Consultez les annonces et les alertes par courriel de Jobillico. Les offres intéressantes peuvent être ajoutées manuellement avec leur description complète.",
  "sources.openSearch": "Ouvrir la recherche",
  "sources.info":
    "Indeed et Jobillico ouvrent pour l’instant une recherche sur leurs propres sites. Il n’y a ici ni connexion automatique à leurs comptes, ni lecture de courriels, ni extraction de données.",
  "import.title": "Vous avez un fil d’offres ?",
  "import.text":
    "Importez un fichier RSS/Atom téléchargé. Les offres apparaîtront dans votre espace ; un nouvel import ne crée pas de doublons.",
  "import.button": "Importer un XML",

  "toast.aiDraftSaved":
    "Le nouveau brouillon IA est enregistré. Vérifiez les faits, l’actualité et la mise en page.",
  "toast.jobSaved": "L’offre est enregistrée dans votre espace",
  "toast.bookmarkRemoved": "Retirée des favoris",
  "toast.bookmarkAdded": "Ajoutée aux favoris",
  "toast.markedSubmitted":
    "Indiquée comme envoyée par vous. Le site n’a transmis aucune candidature.",
  "toast.stageUpdated": "Statut mis à jour",
  "toast.addCvFirst": "Ajoutez d’abord votre CV au profil",
  "toast.addFullDescription":
    "Ajoutez la description complète du poste avant de préparer les documents",
  "toast.packetDraftCreated":
    "Le brouillon du dossier est créé. Adaptez le texte et vérifiez les faits.",
  "toast.profileSaved": "Profil enregistré",
  "toast.imported": "Offres importées : {count}",
  "toast.importedPartly":
    "Offres importées : {count}. Ignorées : {skipped} — votre espace contient au maximum {max} offres, et les entrées aux champs trop longs ne sont pas importées.",
  "toast.settingsSaved": "Paramètres enregistrés",
  "toast.restored":
    "La copie est restaurée. La version précédente a été téléchargée séparément.",
  "toast.cvImported":
    "Le texte du CV est lu. Vérifiez-le et enregistrez le profil.",
  "toast.docx":
    "DOCX téléchargé. Vérifiez la mise en page finale avant l’envoi.",
  "toast.docxFailed": "Impossible de créer le DOCX. Essayez le fichier texte.",
  "toast.promptCopied":
    "La requête est copiée. Vérifiez quelles données vous envoyez au service d’IA choisi.",
  "toast.promptDownloaded": "La requête est téléchargée dans un fichier.",
  "toast.packetApproved":
    "Le dossier est indiqué comme vérifié par vous. La candidature n’est pas encore envoyée.",
  "toast.recoveryAccepted":
    "Le service de messagerie a accepté la demande de courriel de récupération.",
  "toast.accountDeleted": "Le compte et ses données infonuagiques sont supprimés.",
  "toast.llmSaved": "Paramètres du LLM enregistrés.",

  "settings.title": "Paramètres",
  "settings.subtitle": "La recherche et votre espace personnel",
  "settings.tabsAria": "Sections des paramètres",
  "settings.tab.search": "Recherche",
  "settings.tab.sync": "Synchronisation",
  "settings.tab.data": "Mes données",
  "settings.search.info":
    "Adaptez la recherche à vos besoins. Les champs vides ne limitent pas les résultats.",
  "settings.city.label": "Ville ou région",
  "settings.city.hint":
    "Par exemple : Montréal, Laval ou QC. Le filtre vérifie le nom du lieu dans l’annonce.",
  "settings.city.placeholder": "Où souhaitez-vous travailler ?",
  "settings.roles.label": "Titres de poste",
  "settings.roles.hint":
    "Séparés par des virgules. Utilisez les variantes de titres telles que les employeurs les écrivent.",
  "settings.roles.placeholder":
    "Par exemple : comptable, administrative assistant",
  "settings.minHourly.label": "Rémunération minimale, CAD / heure",
  "settings.minHourly.hint":
    "Les offres sans montant horaire restent dans la liste.",
  "settings.minHourly.placeholder": "Sans limite",
  "settings.documentLanguage": "Langue des nouveaux documents",
  "settings.apply": "Appliquer ces critères à la liste des offres",
  "settings.languageNote":
    "La langue de l’offre et le niveau de maîtrise des langues n’influencent pas la sélection.",
  "settings.footer": "Votre espace privé",

  "auth.checkEmail":
    "Consultez votre messagerie et confirmez l’adresse. Après la confirmation, connectez-vous ici.",
  "auth.signedIn": "Connexion réussie. Chargement de votre espace.",
  "auth.failed": "Impossible de se connecter.",
  "auth.signOutFailed": "Impossible de se déconnecter. Réessayez.",
  "auth.signedOut": "Vous êtes déconnecté(e) du compte",
  "auth.signedOutRemoved":
    "Vous êtes déconnecté(e) du compte. La copie locale a été supprimée.",
  "auth.signedOutKept":
    "Vous êtes déconnecté(e) du compte, mais la copie locale n’a pas été supprimée. Reconnectez-vous pour synchroniser les modifications ou relancer la suppression.",
  "auth.signOut": "Se déconnecter",
  "signOut.title": "Se déconnecter du compte sur cet appareil ?",
  "signOut.remove": "Supprimer la copie locale des données de ce navigateur",
  "signOut.removeHint":
    "La copie infonuagique reste dans le compte. Supprimez la copie locale sur un appareil partagé ou qui n’est pas le vôtre.",
  "signOut.unsynced":
    "Certaines modifications ne sont pas encore synchronisées. Supprimer la copie locale les fera perdre.",
  "signOut.discard": "Oui, supprimer les modifications non synchronisées",
  "auth.password": "Mot de passe",
  "auth.passwordNew": "Au moins 10 caractères",
  "auth.passwordCurrent": "Votre mot de passe",
  "auth.create": "Créer un compte",
  "auth.signIn": "Se connecter",
  "auth.haveAccount": "Vous avez déjà un compte ? Se connecter",
  "auth.first": "Première visite ? Créer un compte",
  "auth.note":
    "Après la connexion, votre copie infonuagique s’ouvre. Un nouveau compte conserve l’espace local actuel.",

  "data.title": "Copie de sauvegarde",
  "data.text":
    "Enregistrez le profil, les paramètres, les offres et les documents dans un seul fichier. La copie contient des données personnelles : conservez-la en lieu sûr.",
  "data.download.detail": "Toutes les données de l’espace actuel",
  "data.restore": "Restaurer à partir d’un fichier",
  "data.restore.detail": "Sauvegarde JobSearch, fichier jusqu’à 10 Mo",
  "data.restoreConfirm.title": "Restaurer cette copie ?",
  "data.restoreConfirm.text":
    "Offres : {jobs}. Candidatures : {applications}. Documents : {packets}. Les données actuelles seront remplacées, puis synchronisées après la connexion.",
  "data.info":
    "Sans connexion, les données ne sont accessibles que dans ce navigateur. Effacer les données du navigateur supprime la copie locale.",

  "profile.title": "Votre profil professionnel",
  "profile.subtitle": "Les faits sur lesquels s’appuieront vos documents.",
  "profile.version": "Version {version}",
  "profile.name.label": "Prénom et nom",
  "profile.name.placeholder": "Comment vous présenter à l’employeur",
  "profile.headline.label": "Titre professionnel",
  "profile.headline.placeholder": "Votre spécialité ou votre domaine",
  "profile.phone": "Téléphone",
  "profile.summary.label": "Votre expérience en bref",
  "profile.summary.placeholder":
    "Quelques phrases sur votre expérience, vos points forts et vos résultats.",
  "profile.skills.label": "Compétences confirmées",
  "profile.skills.hint":
    "Séparées par des virgules. Nous mettons en évidence les correspondances textuelles exactes avec l’offre : c’est un indice, pas une estimation de vos chances.",
  "profile.cv.title": "Votre CV",
  "profile.cv.import": "Importer DOCX / TXT",
  "profile.cv.label": "Texte du CV",
  "profile.cv.hint":
    "Le fichier est traité dans le navigateur. Le texte extrait est conservé, sans la mise en forme d’origine.",
  "profile.cv.placeholder":
    "Collez le texte complet du CV ou importez un document…",
  "profile.saveNote": "Les modifications prennent effet après l’enregistrement.",
  "profile.save": "Enregistrer le profil",
  "guide.title": "Votre expérience reste la vôtre",
  "guide.text":
    "Nous adaptons les accents à l’offre. Les postes, les dates, la formation et les réalisations restent tels que vous les avez confirmés.",
  "guide.step1": "Un seul profil à jour",
  "guide.step2": "Des documents distincts pour chaque candidature",
  "guide.step3": "Une vérification avant l’envoi",
  "guide.tip":
    "Ajoutez des résultats concrets tirés de votre expérience. Cela aide à préparer une candidature convaincante.",

  "jobForm.subtitle": "Enregistrez une annonce de n’importe quel site",
  "jobForm.title.label": "Titre du poste *",
  "jobForm.title.placeholder": "Titre de l’annonce",
  "jobForm.employer.label": "Employeur *",
  "jobForm.employer.placeholder": "Nom de l’entreprise",
  "jobForm.location.label": "Ville / région",
  "jobForm.location.placeholder": "Par exemple : Laval, QC",
  "jobForm.url.label": "Lien vers l’annonce originale",
  "jobForm.salary.label": "Rémunération, comme dans l’annonce",
  "jobForm.salary.placeholder": "Par exemple : $25–30 hourly",
  "jobForm.description.placeholder":
    "Tâches, exigences et conditions de travail…",
  "jobForm.full": "J’ai ajouté la description complète, y compris les exigences",

  "docs.empty.title": "À chaque offre sa candidature",
  "docs.empty.text":
    "Ajoutez votre CV au profil, ouvrez une offre avec une description complète et cliquez sur « Préparer les documents ».",
  "docs.empty.button": "Aller aux offres",
  "docs.myPackets": "Mes dossiers",
  "docs.verifiedByYou": "Vérifié par vous",
  "docs.draft": "Brouillon",
  "docs.verified": "Vérifié",
  "docs.frozen":
    "Instantané des documents au moment de l’indication « Envoyée » ({time}). Le texte est protégé contre les modifications. Pour une nouvelle version, ouvrez l’offre et préparez un nouveau dossier.",
  "docs.outdated":
    "Le profil ou l’offre a changé depuis la création de ce dossier. Vérifiez les documents ou créez une nouvelle version.",
  "docs.info.llm":
    "Ce dossier a été adapté par un LLM externe. Vérifiez chaque affirmation, les dates, les qualifications et la mise en page finale. Les sources et l’historique de la requête sont accessibles dans l’offre.",
  "docs.info.base":
    "Le dossier part de votre CV d’origine et d’une lettre de base. Dans l’offre, vous pouvez lancer « Adapter le CV et la lettre » avec le LLM configuré ou copier une requête pour votre propre assistant.",
  "docs.tab.letter": "Lettre de motivation",
  "docs.aiPrompt": "Requête pour l’IA",
  "docs.cvAria": "Texte du CV adapté",
  "docs.letterAria": "Texte de la lettre de motivation",
  "docs.exporting": "Préparation…",
  "docs.print": "Imprimer / PDF",
  "docs.approve": "J’ai vérifié",
  "docs.note":
    "Le texte est enregistré pendant la modification. Le DOCX a une mise en forme simple ; vérifiez la mise en page finale dans Word ou avant l’impression. L’indication « vérifié » ne signifie pas que la candidature est envoyée.",

  "recovery.title": "Nouveau mot de passe",
  "recovery.subtitle": "Récupération de l’accès à JobSearch",
  "recovery.repeat": "Répétez le mot de passe",
  "recovery.mismatch": "Les mots de passe ne correspondent pas.",
  "recovery.updated": "Mot de passe mis à jour. Vous pouvez continuer.",
  "recovery.failed":
    "Impossible de mettre à jour le mot de passe. Vérifiez les exigences ou demandez un nouveau courriel de récupération.",
  "recovery.save": "Enregistrer le nouveau mot de passe",

  "ai.title": "Évaluation et adaptation par IA",
  "ai.signIn":
    "Connectez-vous pour conserver les résultats de l’IA et utiliser la limite mensuelle.",
  "ai.unconfigured": "Un administrateur doit configurer le LLM externe.",
  "ai.note":
    "Le bouton envoie le texte du profil et de l’offre au LLM configuré. Les faits et les documents obtenus doivent être vérifiés.",
  "ai.match": "Évaluer la correspondance",
  "ai.tailor": "Adapter le CV et la lettre",
  "ai.refreshHistory": "Actualiser l’historique IA",
  "ai.refreshService": "Actualiser le service IA",
  "ai.busy":
    "Le LLM traite la requête. Le résultat sera enregistré dans votre historique.",
  "ai.usage":
    "Ce mois-ci : {used} jetons · réserve {reserved} · limite {limit}",
  "ai.unlimited": "sans limite",
  "ai.noScore": "Preuves insuffisantes",
  "ai.score": "{score} % de correspondance",
  "ai.stale.match":
    "Le profil, l’offre ou les préférences ont changé. Cette évaluation porte sur la version précédente.",
  "ai.provisional": "Évaluation préliminaire d’après la description courte.",
  "ai.coverage":
    "Couverture par les preuves : {coverage} %. L’évaluation tient compte des critères connus : confirmé = 100 %, expérience transférable = 60 %, contradiction = 0 % ; les exigences obligatoires comptent double. Les données inconnues et les langues sont exclues du pourcentage. Ce n’est pas une prévision d’embauche.",
  "ai.showSources": "Afficher les sources",
  "ai.questions": "Questions à préciser",
  "ai.draft.title": "Documents adaptés — brouillon",
  "ai.stale.draft":
    "Les données d’entrée ont changé. Ce brouillon utilise le profil enregistré en version {version} ; vérifiez qu’il est toujours à jour.",
  "ai.needsCheck": "Vérification nécessaire",
  "ai.numbers.cv": "CV : {numbers} introuvable dans votre profil. Ligne : « {line} »",
  "ai.numbers.letter": "Lettre : {numbers} introuvable dans votre profil. Ligne : « {line} »",
  "ai.numbers.omitted": "Autres lignes avec des nombres absents de votre profil : {count}.",
  "ai.viewTexts": "Voir les textes et les sources",
  "ai.saveAsPacket": "Enregistrer comme nouveau dossier",
  "ai.history": "Historique des requêtes ({count})",
  "ai.history.match": "Évaluation",
  "ai.history.tailor": "Documents",
  "ai.history.done": "Terminée",
  "ai.history.pending": "En cours",
  "ai.history.tokens": "{tokens} jetons",
  "ai.history.estimated": "(estimation d’après la réserve)",
  "ai.status.supported": "Confirmé par une source",
  "ai.status.transferable": "Expérience transférable",
  "ai.status.unknown": "Inconnu",
  "ai.status.contradicted": "Écart confirmé",
  "ai.status.excluded": "Hors évaluation",
  "ai.decision.prioritize": "À traiter en priorité",
  "ai.decision.consider": "À envisager",
  "ai.decision.needs_information": "Précisions nécessaires",
  "ai.decision.deprioritize": "Écarts importants",

  "admin.title": "Administration",
  "admin.subtitle": "Utilisateurs, LLM externe et messagerie",
  "admin.tab.users": "Utilisateurs",
  "admin.tab.llm": "LLM externe",
  "admin.tab.smtp": "Messagerie",
  "admin.users.title": "Comptes inscrits",
  "admin.users.empty": "Cette liste ne contient aucun utilisateur.",
  "admin.role.admin": "Administrateur",
  "admin.role.user": "Utilisateur",
  "admin.registered": "Inscription : {date}",
  "admin.confirmed": "Courriel confirmé",
  "admin.unconfirmed": "Courriel non confirmé",
  "admin.lastSignIn": "Dernière connexion : {date}",
  "admin.recoveryEmail": "Courriel de récupération",
  "admin.prev": "Précédents",
  "admin.next": "Suivants",
  "admin.page": "Page {page}",
  "admin.delete.aria": "Confirmation de la suppression",
  "admin.delete.title": "Supprimer {email} ?",
  "admin.delete.text":
    "Le compte, son espace infonuagique et son historique IA seront supprimés définitivement. Des copies locales peuvent subsister sur les appareils.",
  "admin.delete.confirmLabel": "Saisissez le courriel pour confirmer",
  "admin.delete.button": "Supprimer définitivement le compte",
  "admin.llm.baseUrl.hint":
    "Adresse HTTPS de base, par exemple https://api.openai.com/v1",
  "admin.llm.key.hintSaved":
    "La clé est conservée sur le serveur. Laissez vide pour la garder.",
  "admin.llm.key.hintNew":
    "La clé est conservée sur le serveur et n’est jamais renvoyée au navigateur.",
  "admin.llm.key.placeholderSaved": "La clé enregistrée n’est pas affichée",
  "admin.llm.key.placeholderNew": "Saisissez l’API Key",
  "admin.llm.model.placeholder": "Identifiant du modèle de votre fournisseur",
  "admin.llm.effort.hint":
    "Les niveaux disponibles dépendent du modèle. Default n’envoie pas ce paramètre.",
  "admin.llm.effort.default": "Default (valeur par défaut du modèle)",
  "admin.llm.budget.hint":
    "Par utilisateur et par mois civil UTC. Jetons d’entrée + de sortie, raisonnement compris. 0 = sans limite.",
  "admin.llm.note":
    "Avant l’appel, une estimation prudente de l’entrée et la réponse maximale sont réservées. Une fois l’appel terminé, l’usage déclaré par le fournisseur est compté ; si le résultat est inconnu, la réserve est facturée. Le fournisseur doit prendre en charge JSON Schema pour le modèle et le format choisis.",
  "admin.llm.save": "Enregistrer le LLM",

  "smtp.title": "Messagerie pour l’inscription et la récupération",
  "smtp.note":
    "Les paramètres s’appliquent à Supabase Auth. L’enregistrement n’envoie pas de courriel de test. Remplissez ces champs lorsque vous aurez choisi un fournisseur de messagerie.",
  "smtp.token.hint":
    "Nécessaire pour appliquer les paramètres à ce projet. Il s’agit d’un jeton de gestion Supabase, et non d’un mot de passe SMTP ou d’une clé publique.",
  "smtp.token.note":
    "Le jeton sert uniquement à cette opération, n’est conservé ni dans la base ni dans le stockage du navigateur, et est effacé après l’application. Limitez son accès à ce projet et à la lecture/modification de la configuration Auth.",
  "smtp.token.link": "Ouvrir les jetons Supabase",
  "smtp.load": "Charger les paramètres actuels",
  "smtp.loaded.custom": "Les paramètres SMTP personnalisés sont chargés.",
  "smtp.loaded.none": "Aucun SMTP personnalisé n’est encore défini.",
  "smtp.notLoaded": "Les paramètres Supabase actuels ne sont pas encore chargés.",
  "smtp.port.hint":
    "Généralement 587 ou 465 ; utilisez le port de votre fournisseur.",
  "smtp.password.hintSaved":
    "Le mot de passe est déjà enregistré dans Supabase. Un champ vide le conserve ; changer d’hôte ou d’identifiant exige un nouveau mot de passe.",
  "smtp.password.hintNew":
    "Le mot de passe sera conservé dans les paramètres de messagerie de Supabase et ne sera pas renvoyé à l’interface.",
  "smtp.senderEmail": "Courriel de l’expéditeur",
  "smtp.senderName": "Nom de l’expéditeur",
  "smtp.apply": "Appliquer le SMTP",
  "smtp.applied":
    "Le SMTP est appliqué dans Supabase. La livraison des courriels doit être vérifiée séparément.",

  "workspace.saveFailed":
    "Le navigateur n’a pas pu enregistrer les modifications. Faites une copie de sauvegarde dans les paramètres.",
  "workspace.syncUnavailable":
    "La synchronisation est indisponible. Les modifications locales sont enregistrées ; nous réessaierons.",
  "workspace.tooLarge":
    "Le stockage infonuagique n’a pas accepté les modifications : votre espace dépasse 5 Mo. Les modifications restent sur cet appareil. Enregistrez une copie de sauvegarde dans les paramètres et raccourcissez les textes des documents ou des offres.",
  "workspace.localCorrupted":
    "La copie locale est endommagée. Elle n’a pas été écrasée. Restaurez une sauvegarde depuis les paramètres.",
  "workspace.cloudOpenFailed":
    "Impossible d’ouvrir la copie infonuagique. Les modifications restent sur l’appareil.",
  "workspace.readFailed":
    "L’espace enregistré n’a pas pu être lu. La copie d’origine est conservée pour la récupération ; la synchronisation est suspendue.",
  "workspace.backupFailed":
    "Impossible de créer une copie. Exportez d’abord les données.",
  "workspace.changeRejected":
    "La modification n’a pas été enregistrée. {reason}",
  "workspace.limit.jobs":
    "Trop d’offres : votre espace en contient au maximum {max}.",
  "workspace.limit.applications":
    "Trop de favoris et de candidatures : votre espace en contient au maximum {max}.",
  "workspace.limit.packets":
    "Trop de dossiers de documents : votre espace en contient au maximum {max}.",
  "workspace.limit.size":
    "Votre espace est trop volumineux : l’ensemble des données doit tenir dans 5 Mo.",

  "error.format": "Format de données invalide.",
  "error.textField": "Champ de texte invalide ou trop long.",
  "error.date": "Date invalide.",
  "error.jobId": "Identifiant d’offre invalide.",
  "error.jobState": "État d’offre invalide.",
  "error.urlScheme": "Le lien doit commencer par https:// ou http://.",
  "error.feedRead": "Impossible de lire la mise à jour des offres.",
  "error.fileTooLarge": "Le fichier est trop volumineux. Maximum : 10 Mo.",
  "error.backupVersion":
    "Cette version de la sauvegarde n’est pas prise en charge.",
  "error.profileVersion": "Version de profil invalide.",
  "error.salaryAmount": "Montant de rémunération invalide.",
  "error.settings": "Paramètres invalides.",
  "error.lists": "Liste d’offres ou de documents invalide.",
  "error.applicationState": "État de candidature invalide.",
  "error.packetVersion": "Version de dossier invalide.",
  "error.packetRequirements":
    "Ajoutez un CV et la description complète du poste.",
  "error.jobClosed": "Cette offre est fermée.",
  "error.xml": "Fichier XML invalide ou trop volumineux.",
  "error.rss": "Impossible de lire le fichier RSS/Atom.",
  "error.feedEmpty": "Le fil ne contient aucune offre.",
  "error.maxSize": "Taille maximale : 5 Mo.",
  "error.cvMaxSize": "Taille maximale du CV : 5 Mo.",
  "error.cvType":
    "Choisissez un fichier DOCX ou TXT. Le texte d’un PDF peut être collé dans le champ du CV.",
  "error.cvTooLong": "Trop de texte pour un seul CV.",
  "error.cvEmpty": "Aucun texte trouvé dans le fichier.",
  "error.url": "Vérifiez le lien : http:// ou https:// est requis.",
  "error.titleEmployer": "Indiquez le titre du poste et l’employeur.",
  "error.fullText": "Ajoutez le texte complet de l’offre.",
  "error.workspaceVersion": "Version d’espace invalide.",
  "error.workspaceRead": "Impossible de lire l’espace enregistré.",
  "error.cloudChanged":
    "La copie infonuagique a été modifiée. Enregistrez une sauvegarde avant de vous reconnecter.",
  "error.cloudNotConnected": "Le stockage infonuagique n’est pas encore connecté.",
  "error.unexpectedStorage": "Réponse inattendue du stockage.",

  "service.notConnected": "La synchronisation n’est pas connectée.",
  "service.default":
    "Le service est temporairement indisponible. Les données enregistrées restent dans votre espace.",
  "service.smtp_management_required":
    "Saisissez le Supabase Management Token pour appliquer le SMTP.",
  "service.smtp_management_failed":
    "Impossible de lire les paramètres de messagerie. Vérifiez l’accès du jeton à ce projet.",
  "service.smtp_update_failed":
    "Supabase a refusé les paramètres de messagerie. Vérifiez les paramètres et les droits du jeton.",
  "service.smtp_update_uncertain":
    "Le résultat de l’application est inconnu. Chargez d’abord les paramètres actuels et vérifiez-les avant de réessayer.",
  "service.smtp_password_required":
    "Saisissez le mot de passe SMTP. Un nouveau serveur ou identifiant exige un nouveau mot de passe.",
  "service.invalid_smtp_host":
    "Saisissez le domaine du serveur SMTP sans protocole ni numéro de port.",
  "service.invalid_smtp_port":
    "Le numéro de port doit être compris entre 1 et 65535.",
  "service.authentication_required": "Connectez-vous à un compte confirmé.",
  "service.admin_required": "Cette action est réservée à l’administrateur.",
  "service.llm_unconfigured":
    "L’administrateur n’a pas encore configuré le LLM.",
  "service.budget_exceeded":
    "Limite mensuelle insuffisante pour cette requête. La limite inclut une réserve pour la réponse.",
  "service.request_in_progress":
    "Une autre de vos requêtes est encore en cours. Actualisez l’historique un peu plus tard.",
  "service.config_conflict":
    "Les paramètres ont déjà changé. Actualisez-les avant d’enregistrer.",
  "service.action_rate_limited":
    "Cette action vient d’être effectuée. Réessayez dans une minute.",
  "service.admin_delete_protected":
    "La suppression d’un administrateur depuis ce panneau est interdite.",
  "service.recovery_email_failed":
    "Impossible d’envoyer le courriel. Vérifiez le SMTP et les limites de messagerie de Supabase.",
  "service.delete_failed": "Impossible de supprimer le compte.",
  "service.invalid_base_url":
    "Indiquez une API Base URL HTTPS publique sans paramètres, identifiants ni port non standard.",
  "service.base_url_not_endpoint":
    "Indiquez l’adresse de base de l’API, par exemple https://api.openai.com/v1, sans /responses ni /chat/completions.",
  "service.new_host_needs_key":
    "Un autre hôte d’API exige la saisie de son API Key.",
  "service.provider_address_blocked":
    "L’hôte de l’API n’a pas d’adresse publique autorisée.",
  "service.provider_rate_limited":
    "Le fournisseur a limité la fréquence des requêtes. Réessayez plus tard.",
  "service.provider_auth_failed":
    "Le fournisseur a refusé l’API Key. Contactez l’administrateur.",
  "service.provider_parameters_rejected":
    "Le fournisseur a refusé les paramètres. Vérifiez le modèle, l’API Format, le Reasoning Effort et la prise en charge de JSON Schema.",
  "service.provider_incomplete":
    "Le fournisseur n’a pas terminé la réponse. Aucun dossier n’a été créé.",
  "service.provider_refused": "Le fournisseur a refusé de traiter la requête.",
  "service.provider_interrupted":
    "La connexion avec le fournisseur a été interrompue. La requête n’est pas relancée automatiquement ; la consommation possible de jetons est enregistrée.",
  "service.interrupted":
    "La requête a été interrompue. La consommation possible est comptée d’après la réserve ; il n’y a pas de relance automatique.",
  "service.invalid_output":
    "La réponse du LLM a un format incorrect. Le brouillon n’a pas été accepté.",
  "service.unsupported_evidence":
    "Le LLM a renvoyé des affirmations sans références correctes aux faits. Le brouillon n’a pas été accepté.",
  "service.unsupported_job_quote":
    "Le LLM a cité un texte absent de l’offre.",
  "service.letter_too_long":
    "Le LLM a dépassé la limite de 250 mots pour la lettre.",
  "service.full_open_job_required":
    "L’adaptation exige une offre ouverte avec une description complète.",
  "service.profile_required": "Ajoutez d’abord votre CV au profil.",
  "service.input_too_large":
    "Trop de texte pour une seule requête. Raccourcissez les parties non pertinentes du CV ou de la description.",
};
