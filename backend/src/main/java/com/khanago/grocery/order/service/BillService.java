package com.khanago.grocery.order.service;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.LineSeparator;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.khanago.grocery.order.Order;
import com.khanago.grocery.order.OrderItem;
import com.khanago.grocery.order.repository.OrderRepository;
import com.khanago.grocery.user.AddressFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class BillService {

    // Brand colors
    private static final DeviceRgb BRAND_GREEN      = new DeviceRgb(34, 139, 34);
    private static final DeviceRgb BRAND_DARK_GREEN  = new DeviceRgb(20, 90, 20);
    private static final DeviceRgb ACCENT_ORANGE    = new DeviceRgb(255, 140, 0);
    private static final DeviceRgb ROW_ALT          = new DeviceRgb(245, 250, 245);
    private static final DeviceRgb HEADER_BG        = new DeviceRgb(34, 139, 34);
    private static final DeviceRgb LIGHT_GRAY       = new DeviceRgb(230, 230, 230);
    private static final DeviceRgb TEXT_MUTED        = new DeviceRgb(120, 120, 120);

    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public byte[] generateBill(Long orderId) throws Exception {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(outputStream);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document document = new Document(pdfDoc, PageSize.A4);
        document.setMargins(30, 40, 30, 40);

        PdfFont bold    = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
        PdfFont italic  = PdfFontFactory.createFont(StandardFonts.HELVETICA_OBLIQUE);

        // ── HEADER ────────────────────────────────────────────────────────────
        Table headerTable = new Table(new float[]{2, 5}).setWidth(UnitValue.createPercentValue(100));
        headerTable.setBorder(Border.NO_BORDER);

        // Logo (left cell)
        Cell logoCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE);
        try {
            ClassPathResource logoRes = new ClassPathResource("static/orderkro-logo.png");
            if (!logoRes.exists()) {
                // Try alternate path
                logoRes = new ClassPathResource("orderkro-logo.png");
            }
            if (logoRes.exists()) {
                Image logo = new Image(ImageDataFactory.create(logoRes.getContentAsByteArray()))
                        .setWidth(80).setAutoScaleHeight(true);
                logoCell.add(logo);
            } else {
                logoCell.add(new Paragraph("🛒").setFont(bold).setFontSize(36).setFontColor(BRAND_GREEN));
            }
        } catch (Exception e) {
            log.warn("Logo not found, using text fallback");
            logoCell.add(new Paragraph("🛒").setFont(bold).setFontSize(32).setFontColor(BRAND_GREEN));
        }
        headerTable.addCell(logoCell);

        // Brand name + tagline (right cell)
        Cell brandCell = new Cell().setBorder(Border.NO_BORDER)
                .setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE);
        brandCell.add(new Paragraph("OrderKro")
                .setFont(bold).setFontSize(28).setFontColor(BRAND_GREEN).setMarginBottom(2));
        brandCell.add(new Paragraph("Fresh. Fast. At Your Doorstep.")
                .setFont(italic).setFontSize(10).setFontColor(TEXT_MUTED).setMarginBottom(4));
        brandCell.add(new Paragraph("www.orderkro.in  |  orderkrosupport@gmail.com")
                .setFont(regular).setFontSize(8).setFontColor(TEXT_MUTED));
        headerTable.addCell(brandCell);
        document.add(headerTable);

        // Green divider
        SolidLine line = new SolidLine(2f);
        line.setColor(BRAND_GREEN);
        document.add(new LineSeparator(line).setMarginTop(8).setMarginBottom(10));

        // ── RECEIPT TITLE BADGE ──────────────────────────────────────────────
        Table titleBadge = new Table(1).setWidth(UnitValue.createPercentValue(100));
        Cell titleCell = new Cell()
                .setBackgroundColor(HEADER_BG)
                .setBorder(Border.NO_BORDER)
                .setPadding(8)
                .setTextAlignment(TextAlignment.CENTER);
        titleCell.add(new Paragraph("ORDER RECEIPT")
                .setFont(bold).setFontSize(14).setFontColor(ColorConstants.WHITE));
        titleBadge.addCell(titleCell);
        document.add(titleBadge);
        document.add(new Paragraph("").setMarginBottom(8));

        // ── ORDER META (2-column) ─────────────────────────────────────────────
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");
        String orderDate = order.getCreatedAt() != null ? order.getCreatedAt().format(fmt) : "N/A";

        Table metaTable = new Table(new float[]{1, 1}).setWidth(UnitValue.createPercentValue(100)).setMarginBottom(12);
        metaTable.setBorder(Border.NO_BORDER);

        // Left: order info
        Cell leftMeta = new Cell().setBorder(Border.NO_BORDER)
                .setBackgroundColor(ROW_ALT).setPadding(10).setBorderRadius(new com.itextpdf.layout.properties.BorderRadius(6));
        leftMeta.add(metaRow("Order #", "#" + order.getId(), bold, regular));
        leftMeta.add(metaRow("Date", orderDate, bold, regular));
        leftMeta.add(metaRow("Status", order.getStatus().toString(), bold, regular));
        leftMeta.add(metaRow("Payment", order.getPaymentMode().toString(), bold, regular));
        metaTable.addCell(leftMeta);

        // Right: delivery info
        Cell rightMeta = new Cell().setBorder(Border.NO_BORDER)
                .setBackgroundColor(ROW_ALT).setPadding(10).setMarginLeft(8).setBorderRadius(new com.itextpdf.layout.properties.BorderRadius(6));
        rightMeta.add(new Paragraph("Deliver To").setFont(bold).setFontSize(10).setFontColor(BRAND_DARK_GREEN).setMarginBottom(4));
        if (order.getCustomer() != null) {
            rightMeta.add(new Paragraph(order.getCustomer().getFullName()).setFont(bold).setFontSize(11).setMarginBottom(2));
            rightMeta.add(new Paragraph(order.getCustomer().getPhone()).setFont(regular).setFontSize(10).setFontColor(TEXT_MUTED));
        }
                String addressText = AddressFormatter.format(order.getAddress());
                if ("N/A".equals(addressText)) {
                        addressText = AddressFormatter.formatFromNotes(order.getNotes());
                }
                if (!addressText.isBlank() && !"N/A".equals(addressText)) {
                        rightMeta.add(new Paragraph(addressText).setFont(regular).setFontSize(9).setFontColor(TEXT_MUTED).setMarginTop(4));
        }
        metaTable.addCell(rightMeta);
        document.add(metaTable);

        // ── ITEMS TABLE ───────────────────────────────────────────────────────
        document.add(new Paragraph("Items Ordered").setFont(bold).setFontSize(12)
                .setFontColor(BRAND_DARK_GREEN).setMarginBottom(4));

        Table itemsTable = new Table(new float[]{2.5f, 0.8f, 0.7f, 1.5f, 1.5f})
                .setWidth(UnitValue.createPercentValue(100)).setMarginBottom(4);

        // Header row
        String[] cols = {"Item", "Qty", "Unit", "Unit Price", "Total"};
        TextAlignment[] headerAligns = {TextAlignment.LEFT, TextAlignment.CENTER, TextAlignment.CENTER, TextAlignment.RIGHT, TextAlignment.RIGHT};
        for (int i = 0; i < cols.length; i++) {
            Cell headerCell = new Cell()
                    .setBackgroundColor(BRAND_GREEN)
                    .setBorder(Border.NO_BORDER)
                    .setPadding(10)
                    .setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE)
                    .setTextAlignment(headerAligns[i])
                    .add(new Paragraph(cols[i]).setFont(bold).setFontSize(10).setFontColor(ColorConstants.WHITE));
            itemsTable.addHeaderCell(headerCell);
        }

        // Item rows
        boolean alt = false;
        for (OrderItem item : order.getOrderItems()) {
            DeviceRgb rowBg = alt ? ROW_ALT : new DeviceRgb(255, 255, 255);
            itemsTable.addCell(itemCell(item.getProductName(), regular, rowBg, TextAlignment.LEFT));
            // Qty column: show ONLY quantity (e.g., "2")
            String qty = item.getQuantity() != null ? item.getQuantity().toString() : "0";
            itemsTable.addCell(itemCell(qty, regular, rowBg, TextAlignment.CENTER));
            // Unit column: show just the unit (e.g., "kg")
            itemsTable.addCell(itemCell(item.getUnit() != null ? item.getUnit() : "-", regular, rowBg, TextAlignment.CENTER));
            // Unit Price: RIGHT aligned
            itemsTable.addCell(itemCell("₹" + item.getUnitPrice(), regular, rowBg, TextAlignment.RIGHT));
            // Total: RIGHT aligned
            itemsTable.addCell(itemCell("₹" + item.getLineTotal(), bold, rowBg, TextAlignment.RIGHT));
            alt = !alt;
        }
        document.add(itemsTable);

        // ── AMOUNT SUMMARY ────────────────────────────────────────────────────
        Table totalsTable = new Table(new float[]{3, 1}).setWidth(220)
                .setHorizontalAlignment(HorizontalAlignment.RIGHT).setMarginTop(4).setMarginBottom(16);

        addTotalRow(totalsTable, "Subtotal", "₹" + order.getSubtotal(), regular, regular, false);
        addTotalRow(totalsTable, "Delivery Fee", "₹" + order.getDeliveryFee(), regular, regular, false);

        // Total row with accent background
        Cell totalLabelCell = new Cell().setBackgroundColor(ACCENT_ORANGE).setBorder(Border.NO_BORDER).setPadding(8);
        totalLabelCell.add(new Paragraph("TOTAL PAID").setFont(bold).setFontSize(11).setFontColor(ColorConstants.WHITE));
        Cell totalValueCell = new Cell().setBackgroundColor(ACCENT_ORANGE).setBorder(Border.NO_BORDER).setPadding(8).setTextAlignment(TextAlignment.RIGHT);
        totalValueCell.add(new Paragraph("₹" + order.getTotalAmount()).setFont(bold).setFontSize(13).setFontColor(ColorConstants.WHITE));
        totalsTable.addCell(totalLabelCell);
        totalsTable.addCell(totalValueCell);
        document.add(totalsTable);

        // ── DIVIDER ───────────────────────────────────────────────────────────
        SolidLine divider = new SolidLine(1f);
        divider.setColor(LIGHT_GRAY);
        document.add(new LineSeparator(divider).setMarginBottom(12));

        // ── THANK YOU MESSAGE ─────────────────────────────────────────────────
        Table thanksBox = new Table(1).setWidth(UnitValue.createPercentValue(100));
        Cell thanksCell = new Cell().setBorder(new SolidBorder(BRAND_GREEN, 1.5f))
                .setBackgroundColor(new DeviceRgb(240, 255, 240)).setPadding(14).setTextAlignment(TextAlignment.CENTER);
        thanksCell.add(new Paragraph("🎉  Thank You for Ordering with OrderKro!")
                .setFont(bold).setFontSize(13).setFontColor(BRAND_DARK_GREEN).setMarginBottom(6));
        thanksCell.add(new Paragraph("We're packing your fresh groceries with care and rushing them to your door. " +
                "Your trust means everything to us — see you again soon! 🛒✨")
                .setFont(italic).setFontSize(10).setFontColor(new DeviceRgb(50, 100, 50)).setMarginBottom(8));
        thanksCell.add(new Paragraph("Rate your experience in the app • Refer a friend & earn rewards • Fresh deals every day")
                .setFont(regular).setFontSize(8).setFontColor(TEXT_MUTED));
        thanksBox.addCell(thanksCell);
        document.add(thanksBox);

        // ── FOOTER ────────────────────────────────────────────────────────────
        document.add(new Paragraph("\nOrderKro  •  Freshness Guaranteed  •  orderkrosupport@gmail.com")
                .setFont(italic).setFontSize(8).setFontColor(TEXT_MUTED).setTextAlignment(TextAlignment.CENTER));

        document.close();
        return outputStream.toByteArray();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private Paragraph metaRow(String label, String value, PdfFont boldFont, PdfFont regularFont) {
        return new Paragraph()
                .add(label + ": ").setFont(boldFont).setFontSize(9).setFontColor(BRAND_DARK_GREEN)
                .add(new com.itextpdf.layout.element.Text(value).setFont(regularFont).setFontColor(ColorConstants.BLACK))
                .setMarginBottom(3);
    }

    private Cell itemCell(String text, PdfFont font, DeviceRgb bg, TextAlignment align) {
        return new Cell().setBackgroundColor(bg).setBorder(Border.NO_BORDER)
                .setPaddingTop(12).setPaddingBottom(12).setPaddingLeft(10).setPaddingRight(10)
                .setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE)
                .add(new Paragraph(text).setFont(font).setFontSize(9).setTextAlignment(align).setMargin(0));
    }

    private void addTotalRow(Table table, String label, String value,
                              PdfFont labelFont, PdfFont valueFont, boolean highlight) {
        Cell lCell = new Cell().setBorder(Border.NO_BORDER).setPadding(6)
                .setBorderBottom(new SolidBorder(LIGHT_GRAY, 0.5f));
        lCell.add(new Paragraph(label).setFont(labelFont).setFontSize(10));
        Cell vCell = new Cell().setBorder(Border.NO_BORDER).setPadding(6)
                .setTextAlignment(TextAlignment.RIGHT).setBorderBottom(new SolidBorder(LIGHT_GRAY, 0.5f));
        vCell.add(new Paragraph(value).setFont(valueFont).setFontSize(10));
        table.addCell(lCell);
        table.addCell(vCell);
    }
}
