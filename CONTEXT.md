# Faraday

Faraday reviews documents written by hostile outside parties against a confidential internal
corpus, and returns a findings report a person acts on. The component that reads the attacker's
text has no capabilities; the component with capabilities never reads the attacker's text.

The corpus, the documents and the interface are in Spanish. Code and repository documentation
are in English. Some domain terms below keep their Spanish form because that is the canonical
name in Panamanian practice.

## Pipeline

**Reader**:
The component that reads untrusted text. It has no capabilities and cannot produce prose — it
emits enums, numbers, booleans and anchors. It points; it does not describe.
_Avoid_: "the model", which is ambiguous between Reader and Planner.

**Validator**:
Deterministic code, with no model, that confirms the Reader's typed output against data the
attacker does not control.
_Avoid_: "verifier", reserved for the *comisión verificadora* of Ley 22; "checker".

**Planner**:
The component that holds capabilities. It selects the checks to run, chooses the outcome and assembles the report, and never sees
untrusted text — not even quoted: it reads findings as typed records and refers to spans and
parties by ID.
_Avoid_: "operator", "agent" — both imply it executes the domain task, which widens exactly the
surface this design narrows.

**Contained path**:
The Reader/Validator/Planner pipeline. One half of the product's controlled experiment.
Shown in the UI as **Faraday**.
_Avoid_: "safe path", "protected path", which overstate it — the output path remains an attack
surface.

**Naive path**:
The Reader and the Planner merged into one conventional agent: the same model reads the same
document and corpus while holding the Planner's tools, with no output grammar. The control that
demonstrates what containment prevents. Shown in the UI as **Agente convencional**.
_Avoid_: "unsafe path", "baseline".

## Evidence and trust

**Finding**:
One unit of pipeline output, issued by the Validator: a type, a severity and spans pointing into
the source documents. The severity comes from the policy section, never from the Reader.
_Avoid_: "result", "alert", "issue".

**Span**:
A pair of character offsets into an extracted text artifact. Every quotation in a report is a
span.

**Obedience rate**:
The share of repeated runs in which a path carried out an injected instruction. Measured and shown
for the naive path; zero on the contained path by construction, not by luck.

**Anchor**:
A marker the Reader points with, resolved by the Validator to a span. Its granularity follows
what a model can point at reliably: a line marker per table row, a choice from a closed list of
the table's rows when prose refers to a row, and a word marker only inside a single-clause
window. The model chooses markers it can see instead of counting characters it cannot.
_Avoid_: "offset" for what the Reader emits — offsets belong to spans.

**Evidence by pointer**:
The principle that a human-readable explanation is assembled by quoting spans that already
existed in the source, never text a model composed. Quotations are inserted by a template after
the Planner, so no model with capabilities ever reads them.

**Claim**:
A typed value the Reader reports from the document under review, with the anchors it was read
from — a number of days, a percentage, a jurisdiction. The Reader emits claims only, never
verdicts; the Validator turns claims into findings. Stays untrusted end to end.
_Avoid_: "fact", "finding" — a claim is neither until it is confirmed.

**Fact**:
Something confirmable against material we control: our thresholds, lists, policies and
registries.

**Fail closed**:
The rule that a missing mandatory claim routes the document to a person. Approval requires
positive evidence on every mandatory check, so an injection that silences the Reader gains nothing. Possible only over what the corpus
requires the document to declare, so the corpus requires an explicit declaration of everything
it reviews.

**Verification status**:
The Validator's deterministic verdict on one claim: *verified in the text* (the pointed text
contains the value), *corrected* (the claim contradicted a deterministic check and the check's
value was used), *unverified* (the pointer is valid but code cannot check the value) or *missing*
(a mandatory claim is absent). Everything not verified is listed first for review; approval
requires every mandatory claim verified. Says only that the value is in the document — never
that the document is true.
_Avoid_: "confidence", which implies a probability the model reports.

**TRUSTED / UNTRUSTED**:
The provenance label carried by every corpus chunk. `TRUSTED` is ours; `UNTRUSTED` is the
counterparty's. Trust is about where material comes from, never about whether it is secret.
_Avoid_: "trusted" to mean "secret".

**Confidential**:
Material that must not leave the machine. Independent of trust: a client's submission can be
confidential and untrusted at once, and a public *pliego de cargos* is trusted but not
confidential. Faraday's thesis is that a model with no network can hold confidential material and
untrusted text in one context.

**Seed data**:
Versioned lists, registries and thresholds shipped in the repository and labelled `TRUSTED`,
standing in for a firm's real systems of record.
_Avoid_: "mock data", "fixtures" — the substitution is disclosed, not disguised.

**Prompt injection**:
Text inside a document that a model interprets as instruction rather than as content. Faraday
performs no injection detection; an injected instruction reaches a component with nothing to act
with and no field able to carry a sentence.
_Avoid_: describing any part of the system as "detecting" or "blocking" injection.

## Corpus and checks

**Corpus**:
The confidential internal material a document is evaluated against — policy, standard terms,
tender specifications, risk matrices, lists.

**Policy section**:
The unit of the `TRUSTED` corpus: one citable provision — a *pliego* clause, a threshold, a list —
with an identifier, the document types it applies to, its topic and its source citation.
_Avoid_: "policy" for the whole document when one section is meant.

**Document type**:
The kind of document under review — a bid or a source-of-funds letter. Set by the operator at
upload and never inferred from the document, so the attacker cannot choose which checks run.

**Outcome**:
The disposition of a reviewed document: approved, routed to a person, or quarantined. Chosen by
the Planner, or by the naive path, through a tool call.

**Action ledger**:
The visible record of every tool call either path makes. Where an obeyed injection shows up.

**Check**:
One question asked of one document, pairing a `TRUSTED` policy with a candidate region of the
untrusted document. Each check declares the topic its relevant text falls under.

**Checklist**:
The set of checks applicable to a task, derived from policy metadata and refined by the Planner.
Refinement may only add checks, never remove them.

**Coverage pass**:
A classification of *every* chunk of the untrusted document against the closed topic enum,
shared by all checks. It is the only way the pipeline selects what each claim call reads, so every chunk is
considered and none can be silently skipped.
_Avoid_: treating it as injection screening — its purpose is recall.

**Validation primitive**:
A reusable check the Validator can apply to policies it has never seen: structural integrity,
provenance, list membership, threshold comparison, mandatory presence.
_Avoid_: "validator rule", which implies per-policy logic.

**Entity resolution by span**:
Recognising that two mentions name the same party. In a table each row is one party: code
splits the table into rows, the Reader points at rows, and the Validator reads the name from the
row itself. Needed to match the declared beneficial owner against shareholder rows, and, in the
specified ownership-graph extension, to join the two ends of each edge.
_Avoid_: "two-pass entity resolution", a design considered and rejected.

**Hostile document**:
A hand-built document carrying both a real finding and a concealed instruction, used to
demonstrate the pipeline.
_Avoid_: "test document", which understates that it is adversarial by construction.

**Clean document**:
The same document without the concealed instruction. The base onto which a person writes their own
injection to produce a new hostile document; a hostile document's own injection is shown, never
edited.

## Workflow: resident agent onboarding

Named by domain, never by number — the source handoff and the workspace learning records
number the two workflows in opposite order.

**Resident agent** (*agente residente*):
The lawyer or law firm a Panamanian legal person designates to hold the duties Panamanian law
imposes on that role. A *sujeto obligado* under Ley 23 de 2015.

**Beneficial owner** (*beneficiario final*, UBO):
The natural person who ultimately owns or controls 25% or more of a legal person, directly or
indirectly; failing that, whoever exercises control by other means; failing that, the senior
managing official.

**Declared beneficial owner**:
The person the document under review names as its beneficial owner. A claim, compared against
the shareholders whose holdings reach the 25% threshold.

**Corporate shareholder**:
A shareholder that is a legal person, recognised by the Validator from a closed list of corporate
suffixes (S.A., Ltd., Inc., Corp., Fundación) — never by the Reader, whose label could be bent.
At 25% or more it fails closed to a person: the beneficial owner sits behind it, where only the
specified ownership-graph extension could see.
**Effective ownership** (*participación efectiva*):
The share of a legal person that a natural person holds directly plus through every chain of
intermediate entities, each chain contributing the product of its percentages. Computed only by
the ownership-graph extension of the beneficial-owner check, which is specified but not built. A structure with circular holdings has no effective
ownership and is reported as unresolvable.
_Avoid_: "effective control" — control is the statute's separate second test for beneficial
ownership, not what the arithmetic measures.

**Source-of-funds letter** (*carta de origen de fondos*):
A long narrative statement written by the party under investigation explaining where their funds
and wealth come from. This workflow's injection vector.

**Ownership structure** (*estructura societaria*):
The declaration of layered ownership and control across jurisdictions. Input to the ownership
graph. Reviewed as an annex to the source-of-funds letter, so the two form one document.

**PEP** (*persona expuesta políticamente*):
A person holding prominent public functions, plus close family and associates. Triggers enhanced
due diligence.

**High-risk jurisdiction**:
A territory on the firm's own `TRUSTED` list of jurisdictions it treats as high risk. Firm
policy, not a legal list, and confidential: it sits in the Reader's context beside the untrusted
document, which is where Faraday's thesis is demonstrated. Each listed jurisdiction carries its
aliases (Tortola, Islas Vírgenes Británicas, BVI), which let the Validator confirm the Reader's
classification against the quoted text.

## Workflow: public procurement

**Bid** (*propuesta*):
The offer a *proponente* submits in a public tender. The untrusted document in this workflow.
_Avoid_: "quote", "tender" — the tender is the process, not the submission.

**Verification committee** (*comisión verificadora*):
The contracting entity's panel that checks bids against the *pliego de cargos*. The reader of
Faraday's procurement report.

**Tender specification** (*pliego de cargos*):
The requirements the contracting entity sets unilaterally: object, technical requirements,
contract terms, weighting methodology. `TRUSTED`.

**Bid form** (*formulario de propuesta*):
The form the *pliego de cargos* requires every bid to fill in, declaring explicitly the payment
term it accepts and its liability cap. It is what makes those claims mandatory — silence about
them would otherwise mean acceptance of the *pliego*.

**Reference price** (*precio de referencia*):
The price the entity sets after market research, before the public act.

**Liability cap** (*tope de responsabilidad*):
A contract clause capping how much one party can be made to pay the other when something goes
wrong. The *pliego de cargos* sets the contract's liability terms; a bid proposing a lower cap is a
finding.
