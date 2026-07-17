# ⏱️ TeamTime - Project Management Platform

## 📌 Proje Hakkında

TeamTime, ekiplerin proje süreçlerini daha düzenli ve verimli şekilde yönetebilmesi amacıyla geliştirilmekte olan web tabanlı bir proje yönetim platformudur.

Uygulamanın temel amacı; ekiplerin projelerini oluşturabilmesi, görevlerini takip edebilmesi, proje ilerleyişlerini yönetebilmesi ve tüm çalışma süreçlerini tek bir platform üzerinden kontrol edebilmesini sağlamaktır.

Bu proje, Yazılım Mühendisliği staj süreci kapsamında geliştirilen full-stack bir uygulamadır.

---

# 🚀 Proje Amacı ve Kapsamı

Modern yazılım ekiplerinde proje yönetimi sırasında görev takibi, kullanıcı yönetimi ve ekip içi koordinasyon önemli bir süreçtir.

TeamTime ile aşağıdaki ihtiyaçların karşılanması hedeflenmektedir:

- Proje oluşturma ve yönetme
- Kullanıcı kayıt ve giriş işlemleri
- Projelere bağlı görev yönetimi
- Görev durumlarının takip edilmesi
- Ekip çalışmalarının merkezi bir sistem üzerinden yönetilmesi
- Kullanıcı bazlı çalışma alanlarının oluşturulması


---

# ✨ Temel Özellikler

## 👤 Kullanıcı Yönetimi

- Kullanıcı kayıt sistemi
- Kullanıcı giriş sistemi
- Kullanıcı bilgilerinin yönetilmesi
- Oturum kapatma (Logout)
- Kullanıcı bilgilerinin frontend tarafında saklanması


## 📁 Proje Yönetimi

Kullanıcıların projelerini yönetebilmesini sağlayan modül.

Desteklenen işlemler:

- Yeni proje oluşturma
- Projeleri listeleme
- Proje bilgilerini güncelleme
- Proje silme


## ✅ Görev Yönetimi

Projeler içerisinde görev takibi yapılmasını sağlayan modül.

Desteklenen işlemler:

- Projeye görev ekleme
- Görevleri listeleme
- Görev güncelleme
- Görev silme
- Görev durumlarını takip etme


Görev durumları:

- BEKLIYOR
- DEVAM_EDIYOR
- TAMAMLANDI


---

# 🏗️ Sistem Mimarisi

Uygulama modern katmanlı mimari yapısı kullanılarak geliştirilmiştir.



Frontend
|
|
React Application
|
|
REST API
|
|
Spring Boot Backend
|
|
Service Layer
|
|
Repository Layer
|
|
PostgreSQL Database



---

# 🛠️ Kullanılan Teknolojiler


## Frontend

- React
- TypeScript
- Vite
- React Router
- Fetch API
- LocalStorage


## Backend

- Java
- Spring Boot
- Spring Data JPA
- Hibernate
- REST API


## Database

- PostgreSQL


## Development Tools

- Docker
- Git
- GitHub
- Thunder Client
- IntelliJ IDEA
- Visual Studio Code


---

# 🔧 Backend Mimarisi


Backend tarafında katmanlı mimari kullanılmıştır.


## Controller Layer

API isteklerini karşılayan katmandır.

Görevleri:

- HTTP isteklerini almak
- Service katmanına yönlendirmek
- Response döndürmek


## Service Layer

Uygulamanın iş mantığının bulunduğu katmandır.

Görevleri:

- Veri kontrolleri
- İş kurallarının uygulanması
- Repository işlemlerinin yönetilmesi


## Repository Layer

Database işlemlerini gerçekleştiren katmandır.

Spring Data JPA kullanılarak geliştirilmiştir.


## Entity Layer

Veritabanındaki tabloların Java nesneleri ile temsil edilmesini sağlar.


## DTO Layer

Frontend ve backend arasındaki veri transferlerini düzenlemek amacıyla kullanılmıştır.


---

# 🌐 API Yapısı


## User API

### Kullanıcı Kaydı


POST /api/register


Yeni kullanıcı oluşturur.


### Kullanıcı Girişi


POST /api/login


Kullanıcı doğrulaması yapar.


---


## Project API


### Projeleri Listeleme


GET /api/projects



### Proje Oluşturma


POST /api/projects



### Proje Güncelleme


PUT /api/projects/{id}



### Proje Silme


DELETE /api/projects/{id}



---


## Task API


### Görev Oluşturma


POST /api/tasks/{projectId}



### Projeye Ait Görevleri Listeleme


GET /api/tasks/project/{projectId}



### Görev Güncelleme


PUT /api/tasks/{id}



### Görev Silme


DELETE /api/tasks/{id}



---

# 🗄️ Veritabanı Yapısı


Mevcut veritabanı modelleri:


## User

Kullanıcı bilgilerini tutar.

Alanlar:

- id
- name
- surname
- email
- password


## Project

Proje bilgilerini tutar.

Alanlar:

- id
- projectName
- description
- teamName
- startDate
- endDate


## Task

Projeye ait görevleri tutar.

Alanlar:

- id
- title
- description
- status
- project


İlişkiler:


Project 1 ---- N Task


Bir proje birden fazla göreve sahip olabilir.


---

# 📌 Geliştirme Süreci


## Tamamlanan Modüller

✅ React proje altyapısı  
✅ Kullanıcı kayıt sistemi  
✅ Kullanıcı giriş sistemi  
✅ Dashboard kullanıcı gösterimi  
✅ Logout işlemi  
✅ PostgreSQL bağlantısı  
✅ Project CRUD işlemleri  
✅ Task CRUD işlemleri  
✅ Project-Task ilişkisi  


---

# 🔮 Planlanan Geliştirmeler


Projeye ilerleyen süreçlerde aşağıdaki özelliklerin eklenmesi planlanmaktadır:


- Kullanıcı yetkilendirme sistemi
- JWT Authentication
- BCrypt ile şifre güvenliği
- Takım yönetimi
- Dosya paylaşımı
- Proje ilerleme takibi
- Dashboard ekranı
- Docker ile production ortamı
- Deployment işlemleri


---

# 📚 Öğrenilen Teknik Konular


Bu proje geliştirme sürecinde aşağıdaki konularda uygulamalı deneyim kazanılmıştır:


- React component yapısı
- React Router kullanımı
- State yönetimi
- REST API iletişimi
- Spring Boot mimarisi
- Entity ilişkileri
- Spring Data JPA
- PostgreSQL kullanımı
- Docker ile geliştirme ortamı hazırlama
- Git versiyon kontrol sistemi


---

# 👨‍💻 Geliştirici

Bu proje Yazılım Mühendisliği staj çalışması kapsamında geliştirilmiştir.


**Project Status:** 🚧 Under Development

**Version:** v0.1
