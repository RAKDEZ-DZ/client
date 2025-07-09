
import React, { useState } from 'react';
import { CiEdit, CiTrash } from 'react-icons/ci';

import '../App.css';


type FormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  visaType: string;
};

type TravelData = {
  type: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  peopleCount: number;
  purpose: string;
  totalPrice: number;
  remainingPayment: number;
  notes: string;
};

const Etudiants = () => {

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    nationality: '',
    passportNumber: '',
    passportExpiry: '',
    visaType: ''
  });

  const [travelData, setTravelData] = useState<TravelData>({
    type: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    peopleCount: 0,
    purpose: '',
    totalPrice: 0,
    remainingPayment: 0,
    notes: ''
  });

  const [errors, setErrors] = useState<Partial<FormData & TravelData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name) newErrors.name = 'Nom requis';
    if (!formData.email) newErrors.email = 'Email requis';
    if (!formData.phone) newErrors.phone = 'Téléphone requis';
    if (!formData.passportNumber) newErrors.passportNumber = 'Numéro de passeport requis';
    if (!formData.visaType) newErrors.visaType = 'Type de visa requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Formulaire valide:', formData);
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container py-4">
      <div className="">
        <div className="d-flex justify-content-between">
          <h2 className="fw-bold mb-1">Gestion des etudiant</h2>
          <button className="btn fw-semibold" data-bs-toggle="modal" data-bs-target="#dossierModal"
            style={{ backgroundColor: "#00AEEF" }}  >
            + Ajouter un etudiant
          </button>
        </div>
        <div className="d-flex justify-content-center gap-2 w-md-auto my-3">
          <input
            type="text"
            className="form-control w-50 "
            placeholder="Rechercher un etudiant..."
          />
          <button className="btn btn-success fw-semibold">
            Cherche
          </button>
        </div>
      </div>

      <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
        <table className="table table-hover align-middle mb-0" style={{ minWidth: '800px', width: '100%' }}>
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Nom</th>
              <th>Type de Visa</th>
              <th>Pays</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Mark</td>
              <td>Tourisme</td>
              <td>France</td>
              <td>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-success">
                    <CiEdit size={20} />
                  </button>
                  <button className="btn btn-sm btn-danger">
                    <CiTrash size={20} />
                  </button>
                </div>
              </td>
            </tr>
            <tr>
              <td>2</td>
              <td>Jacob</td>
              <td>Études</td>
              <td>Canada</td>
              <td>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-success">
                    <CiEdit size={20} />
                  </button>
                  <button className="btn btn-sm btn-danger">
                    <CiTrash size={20} />
                  </button>
                </div>
              </td>
            </tr>
            <tr>
              <td>3</td>
              <td>Larry</td>
              <td>Affaires</td>
              <td>Allemagne</td>
              <td>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-success">
                    <CiEdit size={20} />
                  </button>
                  <button className="btn btn-sm btn-danger">
                    <CiTrash size={20} />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>


      {/*     mommmmmmmdalllll */}
      <div className="modal fade" id="dossierModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <form className="modal-content" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Ajouter un dossier</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body row g-3">
              {[
                { name: 'name', label: 'Nom & Prénom', type: 'text', placeholder: 'Saisissez le nom complet...' },
                { name: 'email', label: 'Email', type: 'email', placeholder: 'Saisissez l\'email...' },
                { name: 'phone', label: 'Téléphone', type: 'tel', placeholder: 'Saisissez le téléphone...' },
                { name: 'address', label: 'Adresse', type: 'text', placeholder: 'Saisissez l\'adresse...' },
                { name: 'birthDate', label: 'Date de naissance', type: 'date' },
                { name: 'nationality', label: 'Nationalité', type: 'text', placeholder: 'Saisissez la nationalité...' },
                { name: 'passportNumber', label: 'Numéro de passeport', type: 'text', placeholder: 'Saisissez le numéro...' },
                { name: 'passportExpiry', label: 'Date expiration passeport', type: 'date' }
              ].map((field) => (
                <div className="col-md-6" key={field.name}>
                  <label className="form-label">{field.label}</label>
                  <input
                    name={field.name}
                    type={field.type}
                    className={`form-control ${errors[field.name as keyof typeof errors] ? 'is-invalid' : ''}`}
                    placeholder={field.placeholder}
                    value={formData[field.name as keyof FormData] as string}
                    onChange={handleInputChange}
                    required
                  />
                  {errors[field.name as keyof typeof errors] && (
                    <div className="invalid-feedback">
                      {errors[field.name as keyof typeof errors]}
                    </div>
                  )}
                </div>
              ))}

              <div className="col-12">
                <label className="form-label">Type de visa</label>
                <select
                  name="visaType"
                  className={`form-select ${errors.visaType ? 'is-invalid' : ''}`}
                  value={formData.visaType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">-- Sélectionnez un type de visa --</option>
                  <option value="tourisme">Visa Tourisme</option>
                  <option value="affaires">Visa Affaires</option>
                  <option value="études">Visa Études</option>
                  <option value="transit">Visa Transit</option>
                  <option value="travail">Visa Travail</option>
                  <option value="famille">Visa Regroupement familial</option>
                  <option value="soins">Visa Médical / Soins</option>
                </select>
                {errors.visaType && (
                  <div className="invalid-feedback">
                    {errors.visaType}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      </div>


    </div>
  );
};

export default Etudiants;
