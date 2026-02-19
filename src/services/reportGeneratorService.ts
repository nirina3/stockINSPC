import { jsPDF } from 'jspdf';
import { Article, Movement, User, Inventory } from '../types';
import { ExportService } from './exportService';

export interface ReportData {
  title: string;
  subtitle: string;
  generatedAt: string;
  generatedBy: string;
  period: string;
  data: any;
  summary: any;
  charts?: any[];
}

export class ReportGeneratorService {
  // Générer un rapport d'état des stocks
  static async generateStockReport(
    articles: Article[], 
    period: string, 
    format: string,
    generatedBy: string
  ): Promise<ReportData> {
    console.log(`📊 Génération rapport de stock: ${articles.length} articles`);
    
    // Analyser les données
    const stockAnalysis = {
      totalArticles: articles.length,
      normalStock: articles.filter(a => a.status === 'normal').length,
      lowStock: articles.filter(a => a.status === 'low').length,
      outOfStock: articles.filter(a => a.status === 'out').length,
      totalValue: articles.reduce((sum, a) => sum + (a.currentStock * (a.unitPrice || 0)), 0)
    };

    // Analyse par catégorie
    const categoryAnalysis = articles.reduce((acc, article) => {
      if (!acc[article.category]) {
        acc[article.category] = {
          totalArticles: 0,
          totalStock: 0,
          lowStock: 0,
          outOfStock: 0,
          value: 0
        };
      }
      
      acc[article.category].totalArticles++;
      acc[article.category].totalStock += article.currentStock;
      if (article.status === 'low') acc[article.category].lowStock++;
      if (article.status === 'out') acc[article.category].outOfStock++;
      acc[article.category].value += article.currentStock * (article.unitPrice || 0);
      
      return acc;
    }, {} as any);

    const reportData: ReportData = {
      title: 'Rapport d\'État des Stocks',
      subtitle: `Analyse complète des stocks par catégorie - Période: ${this.getPeriodLabel(period)}`,
      generatedAt: new Date().toISOString(),
      generatedBy,
      period,
      data: {
        articles,
        stockAnalysis,
        categoryAnalysis
      },
      summary: {
        totalArticles: stockAnalysis.totalArticles,
        alertsCount: stockAnalysis.lowStock + stockAnalysis.outOfStock,
        categoriesCount: Object.keys(categoryAnalysis).length,
        stockValue: stockAnalysis.totalValue
      },
      charts: [
        {
          type: 'donut',
          title: 'Répartition par Statut',
          data: [
            { name: 'Stock Normal', value: stockAnalysis.normalStock, color: '#00A86B' },
            { name: 'Stock Faible', value: stockAnalysis.lowStock, color: '#D4AF37' },
            { name: 'Rupture', value: stockAnalysis.outOfStock, color: '#DC143C' }
          ]
        },
        {
          type: 'bar',
          title: 'Articles par Catégorie',
          data: Object.entries(categoryAnalysis).map(([category, data]: [string, any]) => ({
            category,
            articles: data.totalArticles,
            stock: data.totalStock
          }))
        }
      ]
    };

    // Exporter selon le format demandé
    await this.exportReport(reportData, format);
    
    return reportData;
  }

  // Générer un rapport de mouvements
  static async generateMovementsReport(
    movements: Movement[], 
    period: string, 
    format: string,
    generatedBy: string
  ): Promise<ReportData> {
    console.log(`📊 Génération rapport de mouvements: ${movements.length} mouvements`);
    
    // Filtrer les mouvements selon la période
    const filteredMovements = ExportService.filterData(movements, { period });
    
    // Analyser les données
    const movementAnalysis = {
      totalMovements: filteredMovements.length,
      entries: filteredMovements.filter(m => m.type === 'entry').length,
      exits: filteredMovements.filter(m => m.type === 'exit').length,
      pending: filteredMovements.filter(m => m.status === 'pending').length,
      validated: filteredMovements.filter(m => m.status === 'validated').length,
      rejected: filteredMovements.filter(m => m.status === 'rejected').length
    };

    // Analyse par service
    const serviceAnalysis = filteredMovements.reduce((acc, movement) => {
      const service = movement.service || 'Service non défini';
      if (!acc[service]) {
        acc[service] = {
          totalMovements: 0,
          entries: 0,
          exits: 0,
          totalQuantity: 0
        };
      }
      
      acc[service].totalMovements++;
      if (movement.type === 'entry') acc[service].entries++;
      if (movement.type === 'exit') acc[service].exits++;
      acc[service].totalQuantity += movement.quantity;
      
      return acc;
    }, {} as any);

    // Analyse temporelle (par jour)
    const dailyAnalysis = filteredMovements.reduce((acc, movement) => {
      const date = movement.date;
      if (!acc[date]) {
        acc[date] = { entries: 0, exits: 0, total: 0 };
      }
      
      if (movement.type === 'entry') acc[date].entries++;
      if (movement.type === 'exit') acc[date].exits++;
      acc[date].total++;
      
      return acc;
    }, {} as any);

    const reportData: ReportData = {
      title: 'Rapport des Mouvements de Stock',
      subtitle: `Historique complet des entrées et sorties - Période: ${this.getPeriodLabel(period)}`,
      generatedAt: new Date().toISOString(),
      generatedBy,
      period,
      data: {
        movements: filteredMovements,
        movementAnalysis,
        serviceAnalysis,
        dailyAnalysis
      },
      summary: {
        totalMovements: movementAnalysis.totalMovements,
        entriesCount: movementAnalysis.entries,
        exitsCount: movementAnalysis.exits,
        pendingCount: movementAnalysis.pending
      },
      charts: [
        {
          type: 'donut',
          title: 'Répartition Entrées/Sorties',
          data: [
            { name: 'Entrées', value: movementAnalysis.entries, color: '#00A86B' },
            { name: 'Sorties', value: movementAnalysis.exits, color: '#DC143C' }
          ]
        },
        {
          type: 'line',
          title: 'Évolution Quotidienne',
          data: Object.entries(dailyAnalysis).map(([date, data]: [string, any]) => ({
            date,
            entries: data.entries,
            exits: data.exits,
            total: data.total
          }))
        }
      ]
    };

    // Exporter selon le format demandé
    await this.exportReport(reportData, format);
    
    return reportData;
  }

  // Générer un rapport de consommation par service
  static async generateConsumptionReport(
    movements: Movement[], 
    articles: Article[],
    period: string, 
    format: string,
    generatedBy: string
  ): Promise<ReportData> {
    console.log(`📊 Génération rapport de consommation: ${movements.length} mouvements`);
    
    // Filtrer les sorties validées selon la période
    const filteredExits = ExportService.filterData(
      movements.filter(m => m.type === 'exit' && m.status === 'validated'), 
      { period }
    );
    
    // Analyse par service
    const serviceConsumption = filteredExits.reduce((acc, movement) => {
      const service = movement.service || 'Service non défini';
      if (!acc[service]) {
        acc[service] = {
          totalMovements: 0,
          totalQuantity: 0,
          articles: new Set(),
          categories: new Set(),
          value: 0
        };
      }
      
      acc[service].totalMovements++;
      acc[service].totalQuantity += movement.quantity;
      acc[service].articles.add(movement.articleId);
      
      // Trouver la catégorie de l'article
      const article = articles.find(a => a.id === movement.articleId);
      if (article) {
        acc[service].categories.add(article.category);
        acc[service].value += movement.quantity * (article.unitPrice || 0);
      }
      
      return acc;
    }, {} as any);

    // Convertir les Sets en nombres
    Object.keys(serviceConsumption).forEach(service => {
      serviceConsumption[service].uniqueArticles = serviceConsumption[service].articles.size;
      serviceConsumption[service].uniqueCategories = serviceConsumption[service].categories.size;
      delete serviceConsumption[service].articles;
      delete serviceConsumption[service].categories;
    });

    // Analyse par catégorie
    const categoryConsumption = filteredExits.reduce((acc, movement) => {
      const article = articles.find(a => a.id === movement.articleId);
      const category = article?.category || 'Catégorie inconnue';
      
      if (!acc[category]) {
        acc[category] = {
          totalMovements: 0,
          totalQuantity: 0,
          services: new Set(),
          value: 0
        };
      }
      
      acc[category].totalMovements++;
      acc[category].totalQuantity += movement.quantity;
      acc[category].services.add(movement.service);
      acc[category].value += movement.quantity * (article?.unitPrice || 0);
      
      return acc;
    }, {} as any);

    // Convertir les Sets en nombres
    Object.keys(categoryConsumption).forEach(category => {
      categoryConsumption[category].uniqueServices = categoryConsumption[category].services.size;
      delete categoryConsumption[category].services;
    });

    const reportData: ReportData = {
      title: 'Rapport de Consommation par Service',
      subtitle: `Analyse détaillée de la consommation - Période: ${this.getPeriodLabel(period)}`,
      generatedAt: new Date().toISOString(),
      generatedBy,
      period,
      data: {
        movements: filteredExits,
        serviceConsumption,
        categoryConsumption
      },
      summary: {
        totalConsumption: filteredExits.reduce((sum, m) => sum + m.quantity, 0),
        servicesCount: Object.keys(serviceConsumption).length,
        categoriesCount: Object.keys(categoryConsumption).length,
        totalValue: Object.values(serviceConsumption).reduce((sum: number, s: any) => sum + s.value, 0)
      },
      charts: [
        {
          type: 'bar',
          title: 'Consommation par Service',
          data: Object.entries(serviceConsumption).map(([service, data]: [string, any]) => ({
            service: service.length > 20 ? service.substring(0, 20) + '...' : service,
            quantity: data.totalQuantity,
            movements: data.totalMovements
          }))
        },
        {
          type: 'donut',
          title: 'Répartition par Catégorie',
          data: Object.entries(categoryConsumption).map(([category, data]: [string, any], index) => ({
            name: category,
            value: data.totalQuantity,
            color: ['#6B2C91', '#00A86B', '#D4AF37', '#DC143C'][index % 4]
          }))
        }
      ]
    };

    // Exporter selon le format demandé
    await this.exportReport(reportData, format);
    
    return reportData;
  }

  // Exporter un rapport selon le format
  private static async exportReport(reportData: ReportData, format: string): Promise<void> {
    const filename = `rapport_${reportData.title.toLowerCase().replace(/\s+/g, '_')}`;
    
    switch (format) {
      case 'csv':
        // Export des données principales en CSV
        if (reportData.data.movements) {
          ExportService.exportToCSV(
            reportData.data.movements,
            filename,
            ['date', 'type', 'articleName', 'quantity', 'service', 'status']
          );
        } else if (reportData.data.articles) {
          ExportService.exportToCSV(
            reportData.data.articles,
            filename,
            ['code', 'name', 'category', 'currentStock', 'status']
          );
        }
        break;
        
      case 'excel':
      case 'json':
        // Export complet en JSON
        ExportService.exportToJSON(reportData, filename);
        break;
        
      case 'pdf':
        // Générer le PDF et le télécharger
        const pdfBlob = await this.generatePDFBlob(reportData);
        ExportService.exportPdfBlob(pdfBlob, filename);
        break;
    }
  }

  // Nouvelle méthode pour générer le PDF sous forme de Blob
  private static async generatePDFBlob(reportData: ReportData): Promise<Blob> {
    console.log('📄 Génération du PDF avec jsPDF...');
    const doc = new jsPDF();

    // Configuration des couleurs INSPC
    const colors = {
      primary: [107, 44, 145], // #6B2C91
      secondary: [0, 168, 107], // #00A86B
      accent: [212, 175, 55], // #D4AF37
      danger: [220, 20, 60], // #DC143C
      text: [51, 51, 51],
      lightGray: [128, 128, 128]
    };

    // Définir les marges et la position initiale
    let yPos = 20;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // En-tête avec logo INSPC (simulé)
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('INSPC - Befelatanana', margin, 15);
    doc.setFontSize(10);
    doc.text('Institut National de Santé Publique et Communautaire', margin, 20);
    
    yPos = 35;

    // Titre du rapport
    doc.setTextColor(...colors.text);
    doc.setFontSize(20);
    doc.text(reportData.title, margin, yPos);
    yPos += 8;

    // Sous-titre
    doc.setFontSize(12);
    doc.setTextColor(...colors.lightGray);
    doc.text(reportData.subtitle, margin, yPos);
    yPos += 15;

    // Informations générales dans un encadré
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);
    doc.text(`Généré le: ${new Date(reportData.generatedAt).toLocaleString('fr-FR')}`, margin + 5, yPos + 6);
    doc.text(`Par: ${reportData.generatedBy}`, margin + 5, yPos + 12);
    doc.text(`Période: ${this.getPeriodLabel(reportData.period)}`, margin + 5, yPos + 18);
    yPos += 30;

    // Résumé exécutif
    doc.setFontSize(14);
    doc.setTextColor(...colors.primary);
    doc.text('Résumé Exécutif', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);
    
    // Afficher le résumé en colonnes
    const summaryEntries = Object.entries(reportData.summary);
    const colWidth = (pageWidth - 2 * margin) / 2;
    
    summaryEntries.forEach((entry, index) => {
      const [key, value] = entry;
      const xPos = margin + (index % 2) * colWidth;
      const currentYPos = yPos + Math.floor(index / 2) * 8;
      
      if (currentYPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
        return;
      }
      
      const label = key.replace(/([A-Z])/g, ' $1').toLowerCase();
      const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
      
      doc.setTextColor(...colors.lightGray);
      doc.text(`${label}:`, xPos, currentYPos);
      doc.setTextColor(...colors.primary);
      doc.text(displayValue.toString(), xPos + 60, currentYPos);
    });
    
    yPos += Math.ceil(summaryEntries.length / 2) * 8 + 10;

    // Données détaillées
    if (reportData.data.articles && reportData.data.articles.length > 0) {
      yPos = this.addArticlesTable(doc, reportData.data.articles, yPos, margin, pageWidth, pageHeight, colors);
    }
    
    if (reportData.data.movements && reportData.data.movements.length > 0) {
      yPos = this.addMovementsTable(doc, reportData.data.movements, yPos, margin, pageWidth, pageHeight, colors);
    }

    // Pied de page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...colors.lightGray);
      doc.text(`Page ${i} sur ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
      doc.text(`© 2024 INSPC Befelatanana`, margin, pageHeight - 10);
    }

    // Retourner le PDF sous forme de Blob
    return doc.output('blob');
  }

  // Méthode helper pour ajouter un tableau d'articles
  private static addArticlesTable(
    doc: jsPDF, 
    articles: Article[], 
    startY: number, 
    margin: number, 
    pageWidth: number, 
    pageHeight: number, 
    colors: any
  ): number {
    let yPos = startY;
    
    // Vérifier s'il y a assez d'espace pour le titre et au moins une ligne
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    // Titre de section
    doc.setFontSize(14);
    doc.setTextColor(...colors.primary);
    doc.text(`Articles (${articles.length})`, margin, yPos);
    yPos += 10;

    // En-têtes de tableau
    doc.setFillColor(...colors.primary);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('Code', margin + 2, yPos + 5);
    doc.text('Nom', margin + 25, yPos + 5);
    doc.text('Catégorie', margin + 80, yPos + 5);
    doc.text('Stock', margin + 120, yPos + 5);
    doc.text('Statut', margin + 150, yPos + 5);
    yPos += 10;

    // Données du tableau
    doc.setTextColor(...colors.text);
    articles.slice(0, 20).forEach((article, index) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = margin;
      }
      
      // Alternance de couleur de fond
      if (index % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(margin, yPos - 2, pageWidth - 2 * margin, 6, 'F');
      }
      
      doc.text(article.code, margin + 2, yPos + 2);
      doc.text(article.name.substring(0, 25), margin + 25, yPos + 2);
      doc.text(article.category, margin + 80, yPos + 2);
      doc.text(`${article.currentStock} ${article.unit}`, margin + 120, yPos + 2);
      
      // Statut avec couleur
      const statusColor = article.status === 'normal' ? colors.secondary :
                         article.status === 'low' ? colors.accent : colors.danger;
      doc.setTextColor(...statusColor);
      const statusText = article.status === 'normal' ? 'Normal' :
                        article.status === 'low' ? 'Faible' : 'Rupture';
      doc.text(statusText, margin + 150, yPos + 2);
      doc.setTextColor(...colors.text);
      
      yPos += 6;
    });
    
    if (articles.length > 20) {
      doc.setTextColor(...colors.lightGray);
      doc.text(`... et ${articles.length - 20} autres articles`, margin, yPos + 5);
      yPos += 10;
    }
    
    return yPos + 15;
  }

  // Méthode helper pour ajouter un tableau de mouvements
  private static addMovementsTable(
    doc: jsPDF, 
    movements: Movement[], 
    startY: number, 
    margin: number, 
    pageWidth: number, 
    pageHeight: number, 
    colors: any
  ): number {
    let yPos = startY;
    
    // Vérifier s'il y a assez d'espace
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    // Titre de section
    doc.setFontSize(14);
    doc.setTextColor(...colors.primary);
    doc.text(`Mouvements (${movements.length})`, margin, yPos);
    yPos += 10;

    // En-têtes de tableau
    doc.setFillColor(...colors.primary);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('Date', margin + 2, yPos + 5);
    doc.text('Type', margin + 25, yPos + 5);
    doc.text('Article', margin + 45, yPos + 5);
    doc.text('Quantité', margin + 100, yPos + 5);
    doc.text('Service', margin + 130, yPos + 5);
    yPos += 10;

    // Données du tableau
    doc.setTextColor(...colors.text);
    movements.slice(0, 15).forEach((movement, index) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = margin;
      }
      
      // Alternance de couleur de fond
      if (index % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(margin, yPos - 2, pageWidth - 2 * margin, 6, 'F');
      }
      
      doc.text(movement.date, margin + 2, yPos + 2);
      
      // Type avec couleur
      const typeColor = movement.type === 'entry' ? colors.secondary : colors.danger;
      doc.setTextColor(...typeColor);
      doc.text(movement.type === 'entry' ? 'Entrée' : 'Sortie', margin + 25, yPos + 2);
      doc.setTextColor(...colors.text);
      
      doc.text(movement.articleName.substring(0, 20), margin + 45, yPos + 2);
      doc.text(`${movement.quantity} ${movement.unit}`, margin + 100, yPos + 2);
      doc.text(movement.service.substring(0, 15), margin + 130, yPos + 2);
      
      yPos += 6;
    });
    
    if (movements.length > 15) {
      doc.setTextColor(...colors.lightGray);
      doc.text(`... et ${movements.length - 15} autres mouvements`, margin, yPos + 5);
      yPos += 10;
    }
    
    return yPos + 15;
  }

  // Générer les données pour PDF (simulation)

  // Formater les données pour l'affichage PDF
  private static formatDataForPDF(reportData: ReportData): any {
    return {
      header: {
        title: reportData.title,
        subtitle: reportData.subtitle,
        date: new Date(reportData.generatedAt).toLocaleDateString('fr-FR'),
        time: new Date(reportData.generatedAt).toLocaleTimeString('fr-FR')
      },
      summary: reportData.summary,
      tables: this.generateTablesForPDF(reportData.data),
      charts: reportData.charts || []
    };
  }

  // Générer les tableaux pour PDF
  private static generateTablesForPDF(data: any): any[] {
    const tables = [];
    
    if (data.articles) {
      tables.push({
        title: 'Liste des Articles',
        headers: ['Code', 'Nom', 'Catégorie', 'Stock', 'Statut'],
        rows: data.articles.map((article: Article) => [
          article.code,
          article.name,
          article.category,
          `${article.currentStock} ${article.unit}`,
          article.status === 'normal' ? 'Normal' : 
          article.status === 'low' ? 'Faible' : 'Rupture'
        ])
      });
    }
    
    if (data.movements) {
      tables.push({
        title: 'Mouvements de Stock',
        headers: ['Date', 'Type', 'Article', 'Quantité', 'Service', 'Statut'],
        rows: data.movements.map((movement: Movement) => [
          movement.date,
          movement.type === 'entry' ? 'Entrée' : 'Sortie',
          movement.articleName,
          `${movement.quantity} ${movement.unit}`,
          movement.service,
          movement.status === 'validated' ? 'Validé' : 
          movement.status === 'pending' ? 'En attente' : 'Rejeté'
        ])
      });
    }
    
    return tables;
  }

  // Obtenir le libellé de la période
  private static getPeriodLabel(period: string): string {
    switch (period) {
      case 'week': return 'Cette semaine';
      case 'month': return 'Ce mois';
      case 'quarter': return 'Ce trimestre';
      case 'year': return 'Cette année';
      default: return 'Toutes les données';
    }
  }

  // Générer un rapport personnalisé
  static async generateCustomReport(
    config: {
      type: string;
      period: string;
      format: string;
      includeCharts: boolean;
      includeDetails: boolean;
      services: string[];
      categories: string[];
    },
    data: {
      articles: Article[];
      movements: Movement[];
      users: User[];
      inventories: Inventory[];
    },
    generatedBy: string
  ): Promise<ReportData> {
    console.log(`📊 Génération rapport personnalisé: ${config.type}`);
    
    // Filtrer les données selon les critères
    let filteredArticles = data.articles;
    let filteredMovements = data.movements;
    
    if (config.categories.length > 0) {
      filteredArticles = filteredArticles.filter(a => 
        config.categories.some(cat => a.category.toLowerCase().includes(cat.toLowerCase()))
      );
    }
    
    if (config.services.length > 0) {
      filteredMovements = filteredMovements.filter(m => 
        config.services.includes(m.service)
      );
    }
    
    // Filtrer par période
    filteredMovements = ExportService.filterData(filteredMovements, { period: config.period });
    
    // Générer le rapport selon le type
    switch (config.type) {
      case 'stock':
        return await this.generateStockReport(filteredArticles, config.period, config.format, generatedBy);
      case 'movements':
        return await this.generateMovementsReport(filteredMovements, config.period, config.format, generatedBy);
      case 'consumption':
        return await this.generateConsumptionReport(filteredMovements, filteredArticles, config.period, config.format, generatedBy);
      default:
        throw new Error(`Type de rapport non supporté: ${config.type}`);
    }
  }
}